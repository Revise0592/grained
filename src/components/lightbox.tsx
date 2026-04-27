'use client'

import { useEffect, useCallback, useState } from 'react'
import { X, ChevronLeft, ChevronRight, MessageSquare, Pencil, Check, RotateCcw, RotateCw, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { cn, imageUrl, formatDate, thumbPath } from '@/lib/utils'
import type { Photo, PhotoComment } from '@prisma/client'
import { Comments } from './comments'

type PhotoWithComments = Photo & { comments: PhotoComment[] }

interface LightboxProps {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onDelete?: (photoId: string) => void
  onRotate?: (photoId: string, rotation: number) => void
  rollInfo?: {
    filmStock?: string | null
    camera?: string | null
    lens?: string | null
  }
}

export function Lightbox({ photos, initialIndex, onClose, onDelete, onRotate, rollInfo }: LightboxProps) {
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
    setPhoto(null)
    setEditing(false)
    setMobilePanel(false)
    setLocalRotation(current.rotation ?? 0)
    fetch(`/api/photos/${current.id}`)
      .then(r => r.json())
      .then((p: PhotoWithComments) => {
        setPhoto(p)
        setLocalRotation(p.rotation ?? 0)
        setForm({
          frameNumber: p.frameNumber?.toString() ?? '',
          shutterSpeed: p.shutterSpeed ?? '',
          aperture: p.aperture ?? '',
          exposureComp: p.exposureComp ?? '',
          focalLength: p.focalLength ?? '',
          notes: p.notes ?? '',
        })
      })
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
    onRotate?.(current.id, next)
  }

  const saveForm = async () => {
    if (!current) return
    setSaving(true)
    await fetch(`/api/photos/${current.id}`, {
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
    setEditing(false)
    const updated = await fetch(`/api/photos/${current.id}`).then(r => r.json())
    setPhoto(updated)
  }

  const deletePhoto = async () => {
    if (!current) return
    if (!confirm('Delete this photo? This cannot be undone.')) return
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
        <p className="text-xs text-white/40 truncate">{current.originalName}</p>
        <button
          onClick={() => editing ? saveForm() : setEditing(true)}
          disabled={saving}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-accent transition-colors"
        >
          {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? (saving ? 'Saving…' : 'Save') : 'Edit'}
        </button>
      </div>

      {current.width && current.height && (
        <p className="text-xs text-white/30">{current.width} × {current.height}</p>
      )}

      <div className="space-y-3">
        <MetaField label="Frame #" value={photo?.frameNumber?.toString() ?? null} editValue={form.frameNumber} editing={editing} type="number" onChange={v => setForm(f => ({ ...f, frameNumber: v }))} />
        <MetaField label="Shutter" value={photo?.shutterSpeed ?? null} editValue={form.shutterSpeed} editing={editing} placeholder="e.g. 1/250" onChange={v => setForm(f => ({ ...f, shutterSpeed: v }))} />
        <MetaField label="Aperture" value={photo?.aperture ?? null} editValue={form.aperture} editing={editing} placeholder="e.g. f/2.8" onChange={v => setForm(f => ({ ...f, aperture: v }))} />
        <MetaField label="EV Comp" value={photo?.exposureComp ?? null} editValue={form.exposureComp} editing={editing} placeholder="e.g. +1" onChange={v => setForm(f => ({ ...f, exposureComp: v }))} />
        <MetaField label="Focal Length" value={photo?.focalLength ?? rollInfo?.lens ?? null} editValue={form.focalLength} editing={editing} placeholder="e.g. 50mm" onChange={v => setForm(f => ({ ...f, focalLength: v }))} />

        {editing ? (
          <div>
            <label className="text-xs text-white/40 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white resize-none h-20 focus:outline-none focus:border-accent/50"
              placeholder="Frame notes…"
            />
          </div>
        ) : photo?.notes ? (
          <div>
            <p className="text-xs text-white/40 mb-1">Notes</p>
            <p className="text-xs text-white/70 leading-relaxed">{photo.notes}</p>
          </div>
        ) : null}

        {!editing && localRotation !== 0 && (
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-white/40">Rotation</span>
            <span className="text-xs text-white/80">{localRotation}°</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <span className="text-sm text-white/60 font-mono">
          {index + 1} / {photos.length}
          {photo?.frameNumber != null && <span className="ml-2 hidden sm:inline">· Frame {photo.frameNumber}</span>}
        </span>

        <div className="flex items-center gap-0.5">
          <button onClick={() => rotate('ccw')} title="Rotate left" className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={() => rotate('cw')} title="Rotate right" className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Info toggle — mobile only */}
          <button
            onClick={() => setMobilePanel(v => !v)}
            title="Info"
            className={cn(
              'md:hidden p-2 rounded-md transition-colors',
              mobilePanel ? 'text-accent bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/10'
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1 md:hidden" />

          <button onClick={deletePhoto} disabled={deleting} title="Delete photo" className="p-2 rounded-md text-white/50 hover:text-red-400 hover:bg-white/10 transition-colors disabled:opacity-30">
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          <button onClick={onClose} className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        {/* Photo pane */}
        <div className="flex-1 flex items-center justify-center relative min-w-0 p-4 overflow-hidden">
          <button
            onClick={prev}
            disabled={index === 0}
            className="absolute left-2 z-10 p-2 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-20"
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
            className="absolute right-2 z-10 p-2 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Side panel — desktop only */}
        <div className="hidden md:flex w-72 shrink-0 border-l border-white/10 flex-col bg-black/40 overflow-hidden">
          <div className="flex border-b border-white/10 shrink-0">
            {(['info', 'comments'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setPanel(tab)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-medium capitalize transition-colors',
                  panel === tab ? 'text-white border-b border-accent' : 'text-white/40 hover:text-white/70'
                )}
              >
                {tab === 'comments' ? (
                  <span className="flex items-center justify-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Comments
                    {photo && photo.comments.length > 0 && (
                      <span className="bg-accent text-accent-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
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
          <div className="md:hidden absolute inset-x-0 bottom-0 bg-black/95 border-t border-white/10 z-20 flex flex-col max-h-[60%]">
            {/* Tab bar */}
            <div className="flex border-b border-white/10 shrink-0">
              {(['info', 'comments'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPanel(tab)}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-medium capitalize transition-colors',
                    panel === tab ? 'text-white border-b border-accent' : 'text-white/40 hover:text-white/70'
                  )}
                >
                  {tab === 'comments' ? (
                    <span className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments
                      {photo && photo.comments.length > 0 && (
                        <span className="bg-accent text-accent-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                          {photo.comments.length}
                        </span>
                      )}
                    </span>
                  ) : 'Info'}
                </button>
              ))}
              <button
                onClick={() => setMobilePanel(false)}
                className="px-3 text-white/40 hover:text-white transition-colors"
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
        <div className="hidden sm:flex h-16 shrink-0 items-center gap-1 px-4 overflow-x-auto scrollbar-thin border-t border-white/10">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              className={cn(
                'shrink-0 h-12 w-12 rounded overflow-hidden border-2 transition-all',
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
        <label className="text-xs text-white/40 block mb-1">{label}</label>
        <input
          type={type}
          value={editValue}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent/50"
        />
      </div>
    )
  }
  if (!value) return null
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-white/40 shrink-0">{label}</span>
      <span className="text-xs text-white/80 text-right">{value}</span>
    </div>
  )
}
