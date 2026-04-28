'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Pencil, Trash2, Camera, Star, ImageIcon, CheckSquare, X, Square, Tag, Plus } from 'lucide-react'
import { cn, formatDate, imageUrl, thumbPath } from '@/lib/utils'
import { Lightbox } from '@/components/lightbox'
import { Comments } from '@/components/comments'
import { UploadZone } from '@/components/upload-zone'
import type { AppSettingsShape } from '@/lib/settings'
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
  const [requireDeleteConfirmation, setRequireDeleteConfirmation] = useState(true)
  const [debugRotation, setDebugRotation] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((settings: AppSettingsShape) => {
        setRequireDeleteConfirmation(settings.dataSafety.requireDeleteConfirmation)
      })
      .catch(() => {})
  }, [])

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft className="h-3.5 w-3.5" />
          All Rolls
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-start gap-4 justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{roll.name}</h1>
            {roll.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">{roll.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {roll.filmStock && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                  <Camera className="h-3 w-3" />
                  {roll.filmStock}
                  {roll.iso && ` · ISO ${roll.iso}`}
                  {roll.pushPull && roll.pushPull !== '0' && ` · ${roll.pushPull}`}
                </span>
              )}
              {roll.filmFormat && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                  {roll.filmFormat}
                </span>
              )}
              {roll.developProcess && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                  {roll.developProcess}
                </span>
              )}
            </div>
            {roll.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roll.tags.map(tag => (
                  <Link
                    key={tag.id}
                    href={`/?tag=${encodeURIComponent(tag.name)}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowUploader((open) => !open)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
            >
              <Plus className="h-3.5 w-3.5" />
              {showUploader ? 'Close uploader' : 'Add photos'}
            </button>
            <Link
              href={`/rolls/${roll.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <button
              onClick={deleteRoll}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors border border-border"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-6">
          {([
            { key: 'photos', label: `Photos${photos.length ? ` (${photos.length})` : ''}` },
            { key: 'info', label: 'Info' },
            { key: 'comments', label: `Comments${roll.comments.length ? ` (${roll.comments.length})` : ''}` },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); exitSelectMode() }}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
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
                <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No photos in this roll yet.</p>
              </div>
            ) : (
              <>
                {/* Photo tab toolbar */}
                <div className="flex items-center justify-between mb-3">
                  {selectMode ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {selected.size} selected
                      </span>
                      <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete {selected.size}
                          </button>
                        )}
                        <button
                          onClick={exitSelectMode}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={enterSelectMode}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        Select
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
          <div className="max-w-lg space-y-6">
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
              <InfoSection title="Notes">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{roll.notes}</p>
              </InfoSection>
            )}
          </div>
        )}

        {/* Comments tab */}
        {tab === 'comments' && (
          <div className="max-w-lg">
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
        'relative aspect-square group cursor-pointer rounded overflow-hidden bg-muted',
        isCover && !selectMode && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-background'
      )}
      onClick={onClick}
    >
      <img
        src={thumbUrl}
        alt={photo.originalName}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
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
        <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-between p-1.5">
          {photo.frameNumber != null && (
            <span className="text-[10px] font-mono text-white/80 bg-black/40 rounded px-1 py-0.5">
              {photo.frameNumber}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onSetCover() }}
            title="Set as cover"
            className={cn(
              'pointer-events-auto p-1 rounded transition-all',
              isCover ? 'text-accent opacity-100' : 'text-white/0 group-hover:text-white/60 hover:text-accent'
            )}
          >
            <Star className="h-3.5 w-3.5" fill={isCover ? 'currentColor' : 'none'} />
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

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-4 text-sm">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
