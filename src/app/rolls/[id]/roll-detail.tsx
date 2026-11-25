'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Pencil, Trash2, Star, ImageIcon, CheckSquare, X, Square, Tag, Plus } from 'lucide-react'
import { cn, formatDate, imageUrl, thumbPath } from '@/lib/utils'
import { Lightbox } from '@/components/lightbox'
import { Comments } from '@/components/comments'
import { UploadZone } from '@/components/upload-zone'
import { useAppSettings } from '@/components/app-settings-context'
import type { Roll, Photo, RollComment, Tag as PrismaTag } from '@prisma/client'

type RollWithRelations = Roll & {
  photos: Photo[]
  comments: RollComment[]
  tags: PrismaTag[]
}

export function RollDetail({ roll: initial }: { roll: RollWithRelations }) {
  const router = useRouter()
  const [roll] = useState(initial)
  const [photos, setPhotos] = useState<Photo[]>(initial.photos)
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(initial.coverPhotoId)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [tab, setTab] = useState<'photos' | 'info' | 'comments'>('photos')

  // Selection state
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deletingSelected, setDeletingSelected] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const { dataSafety } = useAppSettings()
  const requireDeleteConfirmation = dataSafety.requireDeleteConfirmation
  const [debugRotation, setDebugRotation] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setDebugRotation(params.get('debugRotation') === '1')
  }, [])

  const enterSelectMode = () => {
    setSelectMode(true)
    setSelected(new Set())
  }
  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
  }
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selectAll = () => setSelected(new Set(photos.map(p => p.id)))

  const deleteSelected = async () => {
    if (!selected.size) return
    if (
      requireDeleteConfirmation &&
      !confirm(`Delete ${selected.size} photo${selected.size > 1 ? 's' : ''}? This cannot be undone.`)
    ) return
    setDeletingSelected(true)
    await Promise.all([...selected].map(id => fetch(`/api/photos/${id}`, { method: 'DELETE' })))
    setPhotos(prev => prev.filter(p => !selected.has(p.id)))
    exitSelectMode()
    setDeletingSelected(false)
  }

  const deleteRoll = async () => {
    if (
      requireDeleteConfirmation &&
      !confirm(`Delete "${roll.name}" and all its photos? This cannot be undone.`)
    ) return
    setDeleting(true)
    await fetch(`/api/rolls/${roll.id}`, { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  const setCover = async (photoId: string) => {
    setCoverPhotoId(photoId)
    await fetch(`/api/rolls/${roll.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverPhotoId: photoId }),
    })
  }

  // Callbacks from lightbox
  const handleLightboxDelete = (photoId: string) => {
    setPhotos(prev => {
      const next = prev.filter(p => p.id !== photoId)
      // Adjust lightbox index if needed
      if (lightboxIndex !== null && lightboxIndex >= next.length) {
        setLightboxIndex(next.length > 0 ? next.length - 1 : null)
      }
      return next
    })
  }

  const handleLightboxRotate = (photoId: string, rotation: number) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, rotation } : p))
  }

  const thumbUrl = (p: Photo) => {
    return `/api/images/${thumbPath(p.path)}`
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-10 sm:pt-6">
        {/* Breadcrumb */}
        <Link href="/" className="inline-flex h-11 sm:h-8 items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 sm:mb-4">
          <ChevronLeft className="h-3.5 w-3.5" />
          All rolls
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-9 sm:text-[40px] sm:leading-[48px] font-medium text-foreground tracking-tight">{roll.name}</h1>
            {roll.description && (
              <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">{roll.description}</p>
            )}
            {/* Edge print: the roll's film details, set like the text along a negative */}
            {(() => {
              const edge = [
                roll.iso ? `ISO ${roll.iso}` : null,
                roll.pushPull && roll.pushPull !== '0' ? roll.pushPull : null,
                roll.filmFormat,
                roll.developProcess,
              ].filter(Boolean)
              if (!roll.filmStock && edge.length === 0) return null
              return (
                <p className="mt-3 font-mono text-[13px] text-muted-foreground tabular-nums">
                  {roll.filmStock && <span className="text-accent-ink">{roll.filmStock}</span>}
                  {edge.map((part, i) => (
                    <span key={i}>{(roll.filmStock || i > 0) && <span className="px-2 opacity-50">·</span>}{part}</span>
                  ))}
                </p>
              )
            })()}
            {roll.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {roll.tags.map(tag => (
                  <Link
                    key={tag.id}
                    href={`/?tag=${encodeURIComponent(tag.name)}`}
                    className="inline-flex items-center gap-1 h-8 sm:h-7 px-2.5 rounded-md text-[13px] bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Tag className="h-3 w-3" />
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 md:flex md:items-center shrink-0">
            <button
              onClick={() => setShowUploader((open) => !open)}
              className="btn btn-secondary px-3"
            >
              <Plus className="h-4 w-4" />
              {showUploader ? 'Close' : 'Add photos'}
            </button>
            <Link
              href={`/rolls/${roll.id}/edit`}
              className="btn btn-secondary px-3"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <button
              onClick={deleteRoll}
              disabled={deleting}
              className="btn btn-danger px-3"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex gap-0 border-b border-border mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          {([
            { key: 'photos', label: `Frames${photos.length ? ` ${photos.length}` : ''}` },
            { key: 'info', label: 'Info' },
            { key: 'comments', label: `Comments${roll.comments.length ? ` ${roll.comments.length}` : ''}` },
          ] as const).map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => { setTab(t.key); exitSelectMode() }}
              className={cn(
                'h-11 px-4 text-[15px] border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:bg-muted',
                tab === t.key ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Photos tab */}
        {tab === 'photos' && (
          <>
            {showUploader && (
              <div className="mb-4 rounded-lg border border-border p-4">
                <UploadZone
                  targetRollId={roll.id}
                  onSuccess={() => {
                    window.location.assign(`/rolls/${roll.id}`)
                  }}
                />
              </div>
            )}
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-3" strokeWidth={1.5} />
                <p className="text-muted-foreground text-sm">No photos in this roll yet</p>
              </div>
            ) : (
              <>
                {/* Photo tab toolbar */}
                <div className="flex items-center justify-between mb-3">
                  {selectMode ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {selected.size} selected
                      </span>
                      <button onClick={selectAll} className="h-11 sm:h-auto text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                        Select all
                      </button>
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-2">
                    {selectMode ? (
                      <>
                        {selected.size > 0 && (
                          <button
                            onClick={deleteSelected}
                            disabled={deletingSelected}
                            className="btn btn-danger text-destructive px-3"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete {selected.size}
                          </button>
                        )}
                        <button
                          onClick={exitSelectMode}
                          className="btn btn-secondary px-3"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={enterSelectMode}
                        className="btn btn-secondary px-3"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Select
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-2 -mx-4 sm:mx-0">
                  {photos.map((photo, i) => (
                    <PhotoTile
                      key={photo.id}
                      index={i}
                      photo={photo}
                      isCover={photo.id === coverPhotoId}
                      thumbUrl={thumbUrl(photo)}
                      debugRotation={debugRotation}
                      selectMode={selectMode}
                      selected={selected.has(photo.id)}
                      onClick={() => {
                        if (selectMode) {
                          toggleSelect(photo.id)
                        } else {
                          setLightboxIndex(i)
                        }
                      }}
                      onSetCover={() => setCover(photo.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Info tab */}
        {tab === 'info' && (
          <div className="grid gap-8 md:grid-cols-2 md:gap-x-16 max-w-4xl">
            <InfoSection title="Film">
              <InfoRow label="Stock" value={roll.filmStock} />
              <InfoRow label="Format" value={roll.filmFormat} />
              <InfoRow label="ISO" value={roll.iso?.toString()} />
              <InfoRow label="Push/Pull" value={roll.pushPull && roll.pushPull !== '0' ? roll.pushPull : null} />
            </InfoSection>
            <InfoSection title="Camera">
              <InfoRow label="Camera" value={roll.camera} />
              <InfoRow label="Lens" value={roll.lens} />
            </InfoSection>
            <InfoSection title="Dates">
              <InfoRow label="Shot" value={
                roll.dateShotStart
                  ? roll.dateShotEnd && roll.dateShotEnd !== roll.dateShotStart
                    ? `${formatDate(roll.dateShotStart)} – ${formatDate(roll.dateShotEnd)}`
                    : formatDate(roll.dateShotStart)
                  : null
              } />
              <InfoRow label="Developed" value={roll.dateDeveloped ? formatDate(roll.dateDeveloped) : null} />
              <InfoRow label="Added" value={formatDate(roll.createdAt)} />
            </InfoSection>
            <InfoSection title="Development">
              <InfoRow label="Lab" value={roll.lab} />
              <InfoRow label="Process" value={roll.developProcess} />
            </InfoSection>
            {roll.notes && (
              <InfoSection title="Notes" wide>
                <p className="pt-3 text-foreground leading-relaxed whitespace-pre-wrap max-w-[62ch]">{roll.notes}</p>
              </InfoSection>
            )}
          </div>
        )}

        {/* Comments tab */}
        {tab === 'comments' && (
          <div className="max-w-2xl">
            <Comments rollId={roll.id} initialComments={roll.comments} />
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          debugRotation={debugRotation}
          initialIndex={Math.min(lightboxIndex, photos.length - 1)}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleLightboxDelete}
          onRotate={handleLightboxRotate}
          rollInfo={{ filmStock: roll.filmStock, camera: roll.camera, lens: roll.lens }}
        />
      )}
    </>
  )
}

function PhotoTile({
  photo, index, isCover, thumbUrl, selectMode, selected, onClick, onSetCover, debugRotation,
}: {
  photo: Photo
  index: number
  isCover: boolean
  thumbUrl: string
  selectMode: boolean
  selected: boolean
  onClick: () => void
  onSetCover: () => void
  debugRotation: boolean
}) {
  const rotation = photo.rotation ?? 0
  const isTransverse = rotation === 90 || rotation === 270

  return (
    <div
      className={cn(
        'zoom-host relative aspect-square group cursor-pointer sm:rounded overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isCover && !selectMode && 'ring-2 ring-inset ring-accent',
        selected && 'ring-2 ring-inset ring-accent'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Frame ${photo.frameNumber ?? index + 1}${selectMode ? (selected ? ', selected' : '') : ''}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      <div className="zoom h-full w-full">
      <img
        src={thumbUrl}
        alt={photo.originalName}
        className="w-full h-full object-cover"
        style={{
          transform: `rotate(${rotation}deg)${isTransverse ? ' scale(1.5)' : ''}`,
        }}
        loading="lazy"
        onError={e => {
          const t = e.target as HTMLImageElement
          if (!t.src.includes('/api/images/')) return
          t.src = imageUrl(photo.path)
        }}
      />
      </div>

      {/* Select mode overlay — pointer-events-none so clicks reach parent */}
      {selectMode && (
        <div className={cn(
          'absolute inset-0 pointer-events-none transition-colors',
          selected ? 'bg-accent/20' : 'bg-transparent'
        )}>
          <div className="absolute top-1.5 left-1.5">
            {selected
              ? <CheckSquare className="h-5 w-5 text-accent drop-shadow" />
              : <Square className="h-5 w-5 text-white/70 drop-shadow" />
            }
          </div>
        </div>
      )}

      {/* Normal mode overlay — pointer-events-none except the star button */}
      {!selectMode && (
        <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-1.5">
          {photo.frameNumber != null && (
            <span className="text-xs font-mono tabular-nums text-white bg-black/50 rounded px-1 py-px">
              {photo.frameNumber}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onSetCover() }}
            title="Set as cover"
            aria-label={isCover ? 'Cover frame' : 'Set as cover'}
            aria-pressed={isCover}
            className={cn(
              'pointer-events-auto -m-1 p-2 rounded transition-colors',
              isCover
                ? 'text-accent opacity-100'
                : 'text-white/45 [@media(hover:hover)]:text-white/0 group-hover:text-white/70 hover:!text-accent focus-visible:text-white'
            )}
          >
            <Star className="h-4 w-4 drop-shadow" fill={isCover ? 'currentColor' : 'none'} />
          </button>
        </div>
      )}
      {debugRotation && (
        <div className="absolute top-1 right-1 text-[10px] leading-tight font-mono bg-black/70 text-lime-300 px-1.5 py-1 rounded pointer-events-none">
          <div>i:{index}</div>
          <div>r:{rotation}</div>
          <div>id:{photo.id.slice(-6)}</div>
        </div>
      )}
    </div>
  )
}

function InfoSection({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={cn(wide && 'md:col-span-2')}>
      <h2 className="text-[15px] font-medium text-foreground pb-2 mb-1 border-b border-border">{title}</h2>
      {wide ? <div>{children}</div> : <dl className="divide-y divide-border">{children}</dl>}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-[15px] text-foreground text-right tabular-nums">{value}</dd>
    </div>
  )
}
