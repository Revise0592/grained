'use client'

import { useState, useEffect, useCallback } from 'react'
import { Camera, Film, Trash2 } from 'lucide-react'

interface SavedCamera { id: string; name: string }
interface SavedFilmStock { id: string; name: string; iso: number | null }

export default function LibraryPage() {
  const [cameras, setCameras] = useState<SavedCamera[]>([])
  const [filmStocks, setFilmStocks] = useState<SavedFilmStock[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDestructiveActions, setConfirmDestructiveActions] = useState(true)

  const fetchAll = useCallback(async () => {
    const [cRes, fRes, sRes] = await Promise.all([
      fetch('/api/saved/cameras'),
      fetch('/api/saved/film-stocks'),
      fetch('/api/settings'),
    ])
    const [c, f, s] = await Promise.all([cRes.json(), fRes.json(), sRes.json()])
    setCameras(c)
    setFilmStocks(f)
    setConfirmDestructiveActions(Boolean(s?.settings?.safety?.confirmDestructiveActions ?? true))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const deleteCamera = async (id: string) => {
    await fetch(`/api/saved/cameras/${id}`, { method: 'DELETE' })
    setCameras(prev => prev.filter(c => c.id !== id))
  }

  const deleteFilmStock = async (id: string) => {
    await fetch(`/api/saved/film-stocks/${id}`, { method: 'DELETE' })
    setFilmStocks(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your saved cameras and film stocks. Entries are remembered automatically when you save a roll.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Section
            icon={<Camera className="h-4 w-4" />}
            title="Cameras"
            emptyMessage="No cameras saved yet. They'll appear here after you save a roll with a camera."
          >
            {cameras.map(c => (
              <LibraryRow key={c.id} label={c.name} onDelete={() => deleteCamera(c.id)} requireConfirm={confirmDestructiveActions} />
            ))}
          </Section>

          <Section
            icon={<Film className="h-4 w-4" />}
            title="Film Stocks"
            emptyMessage="No custom film stocks saved yet. They'll appear here after you save a roll with a film stock."
          >
            {filmStocks.map(f => (
              <LibraryRow
                key={f.id}
                label={f.name}
                meta={f.iso ? `ISO ${f.iso}` : undefined}
                onDelete={() => deleteFilmStock(f.id)}
                requireConfirm={confirmDestructiveActions}
              />
            ))}
          </Section>
        </>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  emptyMessage,
  children,
}: {
  icon: React.ReactNode
  title: string
  emptyMessage: string
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  const hasItems = items.filter(Boolean).length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      </div>
      {hasItems ? (
        <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
          {children}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground py-3">{emptyMessage}</p>
      )}
    </div>
  )
}

function LibraryRow({ label, meta, onDelete, requireConfirm }: { label: string; meta?: string; onDelete: () => void; requireConfirm: boolean }) {
  const [confirming, setConfirming] = useState(false)

  const handleDelete = () => {
    if (!requireConfirm) {
      onDelete()
      return
    }
    if (!confirming) { setConfirming(true); return }
    onDelete()
  }

  return (
    <li className="flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-foreground truncate">{label}</span>
        {meta && <span className="text-xs text-muted-foreground shrink-0">{meta}</span>}
      </div>
      <button
        onClick={handleDelete}
        onBlur={() => setConfirming(false)}
        className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
          confirming && requireConfirm
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        }`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {confirming && requireConfirm ? 'Confirm' : 'Remove'}
      </button>
    </li>
  )
}
