'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, MessageSquare, Pencil, Check, RotateCcw, RotateCw, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { cn, imageUrl, formatDate, thumbPath } from '@/lib/utils'
import type { Photo, PhotoComment } from '@prisma/client'
import { Comments } from './comments'
import { useAppSettings } from './app-settings-context'

type PhotoWithComments = Photo & { comments: PhotoComment[] }

interface LightboxProps {
  photos: Photo[]
  initialIndex: number
  debugRotation?: boolean
  onClose: () => void
  onDelete?: (photoId: string) => void
  onRotate?: (photoId: string, rotation: number) => void
  rollInfo?: {
    filmStock?: string | null
    camera?: string | null
    lens?: string | null
  }
}

export function Lightbox({ photos, initialIndex, debugRotation = false, onClose, onDelete, onRotate, rollInfo }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [photo, setPhoto] = useState<PhotoWithComments | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    frameNumber: '',
    shutterSpeed: '',
    aperture: '',
    exposureComp: '',
    focalLength: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [panel, setPanel] = useState<'info' | 'comments'>('info')
  const [localRotation, setLocalRotation] = useState(0)
  const { dataSafety } = useAppSettings()
  const requireDeleteConfirmation = dataSafety.requireDeleteConfirmation
  // Mobile: whether the bottom info panel is expanded
  const [mobilePanel, setMobilePanel] = useState(false)

  const current = photos[index]

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex(i => Math.min(photos.length - 1, i + 1)), [photos.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!current) return
    const controller = new AbortController()
    const currentId = current.id
    setPhoto(null)
    setEditing(false)
    setMobilePanel(false)
    setLocalRotation(current.rotation ?? 0)
    fetch(`/api/photos/${current.id}?_=${Date.now()}`, { signal: controller.signal, cache: 'no-store' })
      .then(r => r.json())
      .then((p: PhotoWithComments) => {
        if (currentId !== p.id) return
        setPhoto(p)
        setForm({
          frameNumber: p.frameNumber?.toString() ?? '',
          shutterSpeed: p.shutterSpeed ?? '',
          aperture: p.aperture ?? '',
          exposureComp: p.exposureComp ?? '',
          focalLength: p.focalLength ?? '',
          notes: p.notes ?? '',
        })
      })
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('[lightbox] failed to load photo details', err)
        }
      })
    return () => {
      controller.abort()
    }
  }, [current?.id])

  const rotate = async (dir: 'cw' | 'ccw') => {
    if (!current) return
    const next = ((localRotation + (dir === 'cw' ? 90 : -90)) + 360) % 360
    setLocalRotation(next)
    await fetch(`/api/photos/${current.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rotation: next }),
    })
    setPhoto(prev => prev ? { ...prev, rotation: next } : prev)
    onRotate?.(current.id, next)
  }

  const saveForm = async () => {
    if (!current) return
    setSaving(true)
    const res = await fetch(`/api/photos/${current.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frameNumber: form.frameNumber ? Number(form.frameNumber) : null,
        shutterSpeed: form.shutterSpeed || null,
        aperture: form.aperture || null,
        exposureComp: form.exposureComp || null,
        focalLength: form.focalLength || null,
        notes: form.notes || null,
      }),
    })
    setSaving(false)
    if (!res.ok) return
    setEditing(false)
    const updated = await res.json()
    setPhoto(prev => prev ? { ...prev, ...updated } : prev)
  }

  const deletePhoto = async () => {
    if (!current) return
    if (requireDeleteConfirmation && !confirm('Delete this photo? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/photos/${current.id}`, { method: 'DELETE' })
    onDelete?.(current.id)
    if (photos.length <= 1) {
      onClose()
    } else if (index >= photos.length - 1) {
      setIndex(i => i - 1)
    }
    setDeleting(false)
  }

  if (!current) return null

  const thumbUrl = (p: Photo) => {
    return `/api/images/${thumbPath(p.path)}`
  }

  // Swipe left/right on the photo to move between frames (touch screens).
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0) next()
    else prev()
  }

  const isTransverse = localRotation === 90 || localRotation === 270
  const imgStyle = {
    transform: `rotate(${localRotation}deg)`,
    transition: 'transform 0.2s ease',
    maxWidth: isTransverse ? '70vh' : '100%',
    maxHeight: isTransverse ? '70vw' : '100%',
  }

  const infoPanelContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-mono text-white/60 truncate">{current.originalName}</p>
        <button
          onClick={() => editing ? saveForm() : setEditing(true)}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 px-2 -mr-2 rounded-md text-[13px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? (saving ? 'Saving…' : 'Save') : 'Edit'}
        </button>
      </div>

      {current.width && current.height && (
        <p className="text-[13px] font-mono text-white/50 tabular-nums">{current.width} × {current.height}</p>
      )}

      <div className="space-y-3">
        <MetaField label="Frame" value={photo?.frameNumber?.toString() ?? null} editValue={form.frameNumber} editing={editing} type="number" onChange={v => setForm(f => ({ ...f, frameNumber: v }))} />
        <MetaField label="Shutter" value={photo?.shutterSpeed ?? null} editValue={form.shutterSpeed} editing={editing} placeholder="e.g. 1/250" onChange={v => setForm(f => ({ ...f, shutterSpeed: v }))} />
        <MetaField label="Aperture" value={photo?.aperture ?? null} editValue={form.aperture} editing={editing} placeholder="e.g. f/2.8" onChange={v => setForm(f => ({ ...f, aperture: v }))} />
        <MetaField label="Exposure comp" value={photo?.exposureComp ?? null} editValue={form.exposureComp} editing={editing} placeholder="e.g. +1" onChange={v => setForm(f => ({ ...f, exposureComp: v }))} />
        <MetaField label="Focal length" value={photo?.focalLength ?? rollInfo?.lens ?? null} editValue={form.focalLength} editing={editing} placeholder="e.g. 50mm" onChange={v => setForm(f => ({ ...f, focalLength: v }))} />

        {editing ? (
          <div>
            <label className="text-[13px] text-white/60 block mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-base sm:text-sm text-white resize-none h-24 focus:outline-none focus:border-white/40"
              placeholder="Frame notes…"
            />
          </div>
        ) : photo?.notes ? (
          <div>
            <p className="text-[13px] text-white/60 mb-1">Notes</p>
            <p className="text-sm text-white/85 leading-relaxed">{photo.notes}</p>
          </div>
        ) : null}

        {!editing && localRotation !== 0 && (
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-[13px] text-white/60">Rotation</span>
            <span className="text-sm font-mono text-white/85">{localRotation}°</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div role="dialog" aria-modal="true" aria-label={`Frame ${index + 1} of ${photos.length}`} className="fixed inset-0 z-50 bg-black flex flex-col pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between pl-4 pr-1 sm:px-3 h-14 shrink-0 border-b border-white/10">
        <span className="text-[13px] text-white/70 font-mono tabular-nums">
          {index + 1} / {photos.length}
          {photo?.frameNumber != null && <span className="ml-2">· fr {photo.frameNumber}</span>}
        </span>
        {debugRotation && (
          <span className="text-xs text-lime-300 font-mono">
            i:{index} r:{localRotation} id:{current.id.slice(-6)}
          </span>
        )}

        <div className="flex items-center gap-0.5">
          <button onClick={() => rotate('ccw')} title="Rotate left" aria-label="Rotate left" className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={() => rotate('cw')} title="Rotate right" aria-label="Rotate right" className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="hidden sm:block w-px h-4 bg-white/10 mx-1" />

          {/* Info toggle — mobile only */}
          <button
            onClick={() => setMobilePanel(v => !v)}
            title="Info"
            aria-label="Frame info and comments"
            aria-expanded={mobilePanel}
            className={cn(
              'md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors',
              mobilePanel ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          

          <button onClick={deletePhoto} disabled={deleting} title="Delete photo" aria-label="Delete photo" className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-md text-white/70 hover:text-red-400 hover:bg-white/10 transition-colors disabled:opacity-30">
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="hidden sm:block w-px h-4 bg-white/10 mx-1" />

          <button onClick={onClose} aria-label="Close" className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        {/* Photo pane */}
        <div className="flex-1 flex items-center justify-center relative min-w-0 p-2 sm:p-6 overflow-hidden touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous frame" className="hidden sm:inline-flex absolute left-3 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <img
            key={current.id}
            src={imageUrl(current.path)}
            alt={current.originalName}
            style={imgStyle}
            className="object-contain select-none"
            draggable={false}
          />

          <button
            onClick={next}
            disabled={index === photos.length - 1}
            aria-label="Next frame" className="hidden sm:inline-flex absolute right-3 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Side panel — desktop only */}
        <div className="hidden md:flex w-80 shrink-0 border-l border-white/10 flex-col bg-neutral-950 overflow-hidden">
          <div className="flex border-b border-white/10 shrink-0">
            {(['info', 'comments'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setPanel(tab)}
                className={cn(
                  'flex-1 h-11 text-[13px] font-medium transition-colors',
                  panel === tab ? 'text-white border-b-2 border-accent' : 'text-white/50 hover:text-white/80'
                )}
              >
                {tab === 'comments' ? (
                  <span className="flex items-center justify-center gap-1">
                    
                    Comments
                    {photo && photo.comments.length > 0 && (
                      <span className="font-mono text-white/50 tabular-nums">
                        {photo.comments.length}
                      </span>
                    )}
                  </span>
                ) : 'Info'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {panel === 'info' && infoPanelContent}
            {panel === 'comments' && current && (
              <Comments photoId={current.id} initialComments={photo?.comments ?? []} dark />
            )}
          </div>
        </div>

        {/* Mobile info overlay — slides up from bottom */}
        {mobilePanel && (
          <div className="md:hidden absolute inset-x-0 bottom-0 bg-neutral-950 border-t border-white/10 rounded-t-xl z-20 flex flex-col max-h-[70%]">
            {/* Tab bar */}
            <div className="flex border-b border-white/10 shrink-0">
              {(['info', 'comments'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPanel(tab)}
                  className={cn(
                    'flex-1 h-11 text-[13px] font-medium transition-colors',
                    panel === tab ? 'text-white border-b-2 border-accent' : 'text-white/50 hover:text-white/80'
                  )}
                >
                  {tab === 'comments' ? (
                    <span className="flex items-center justify-center gap-1">
                      
                      Comments
                      {photo && photo.comments.length > 0 && (
                        <span className="font-mono text-white/50 tabular-nums">
                          {photo.comments.length}
                        </span>
                      )}
                    </span>
                  ) : 'Info'}
                </button>
              ))}
              <button
                onClick={() => setMobilePanel(false)}
                aria-label="Hide info"
                className="w-11 inline-flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {panel === 'info' && infoPanelContent}
              {panel === 'comments' && current && (
                <Comments photoId={current.id} initialComments={photo?.comments ?? []} dark />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filmstrip — hidden on mobile */}
      {photos.length > 1 && (
        <div className="hidden sm:flex h-[72px] shrink-0 items-center gap-1.5 px-4 overflow-x-auto scrollbar-thin border-t border-white/10">
          {photos.map((p, i) => (
            <button
              key={p.id}
              aria-label={`Frame ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                'shrink-0 h-12 w-12 rounded overflow-hidden border-2 transition-[border-color,opacity]',
                i === index ? 'border-accent' : 'border-transparent opacity-50 hover:opacity-80'
              )}
            >
              <img
                src={thumbUrl(p)}
                alt=""
                className="w-full h-full object-cover"
                style={{ transform: `rotate(${p.rotation ?? 0}deg)`, scale: (p.rotation === 90 || p.rotation === 270) ? '1.5' : '1' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MetaField({
  label, value, editValue, editing, placeholder, type = 'text', onChange,
}: {
  label: string
  value: string | null
  editValue: string
  editing: boolean
  placeholder?: string
  type?: string
  onChange: (v: string) => void
}) {
  if (editing) {
    return (
      <div>
        <label className="text-[13px] text-white/60 block mb-1.5">{label}</label>
        <input
          type={type}
          value={editValue}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 sm:h-9 bg-white/5 border border-white/15 rounded-md px-3 text-base sm:text-sm text-white focus:outline-none focus:border-white/40"
        />
      </div>
    )
  }
  if (!value) return null
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[13px] text-white/60 shrink-0">{label}</span>
      <span className="text-sm font-mono text-white/90 text-right tabular-nums">{value}</span>
    </div>
  )
}
