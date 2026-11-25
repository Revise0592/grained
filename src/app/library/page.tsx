'use client'

import { useState, useEffect, useCallback } from 'react'
import { Camera, Film, Trash2 } from 'lucide-react'

interface SavedCamera { id: string; name: string }
interface SavedFilmStock { id: string; name: string; iso: number | null }

export default function LibraryPage() {
  const [cameras, setCameras] = useState<SavedCamera[]>([])
  const [filmStocks, setFilmStocks] = useState<SavedFilmStock[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const [cRes, fRes] = await Promise.all([
      fetch('/api/saved/cameras'),
      fetch('/api/saved/film-stocks'),
    ])
    const [c, f] = await Promise.all([cRes.json(), fRes.json()])
    setCameras(c)
    setFilmStocks(f)
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pt-10">
      <div className="pb-6 border-b border-border">
        <h1 className="text-[28px] leading-9 sm:text-[40px] sm:leading-[48px] font-medium tracking-tight text-foreground">Library</h1>
        <p className="text-muted-foreground mt-2 max-w-[62ch]">
          Manage your saved cameras and film stocks. Entries are remembered automatically when you save a roll.
        </p>
      </div>

      {loading ? (
        <p className="py-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Section
            icon={<Camera className="h-4 w-4" />}
            title="Cameras"
            emptyMessage="No cameras yet. Save a roll with a camera and it appears here."
          >
            {cameras.map(c => (
              <LibraryRow key={c.id} label={c.name} onDelete={() => deleteCamera(c.id)} />
            ))}
          </Section>

          <Section
            icon={<Film className="h-4 w-4" />}
            title="Film stocks"
            emptyMessage="No film stocks yet. Save a roll with a film stock and it appears here."
          >
            {filmStocks.map(f => (
              <LibraryRow
                key={f.id}
                label={f.name}
                meta={f.iso ? `ISO ${f.iso}` : undefined}
                onDelete={() => deleteFilmStock(f.id)}
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
    <section className="grid gap-4 py-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-10 md:py-8 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 h-fit">
        <span className="text-muted-foreground" aria-hidden>{icon}</span>
        <h2 className="text-[15px] font-medium text-foreground">{title}</h2>
      </div>
      <div className="min-w-0">
      {hasItems ? (
        <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
          {children}
        </ul>
      ) : (
        <p className="text-muted-foreground">{emptyMessage}</p>
      )}
      </div>
    </section>
  )
}

function LibraryRow({ label, meta, onDelete }: { label: string; meta?: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)

  const handleDelete = () => {
    if (!confirming) { setConfirming(true); return }
    onDelete()
  }

  return (
    <li className="flex min-h-14 items-center justify-between gap-3 pl-4 pr-2 py-2 bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[15px] text-foreground truncate">{label}</span>
        {meta && <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">{meta}</span>}
      </div>
      <button
        onClick={handleDelete}
        onBlur={() => setConfirming(false)}
        className={`btn h-11 sm:h-9 px-3 shrink-0 ${
          confirming
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        }`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {confirming ? 'Confirm' : 'Remove'}
      </button>
    </li>
  )
}
