'use client'

import { useState, useEffect } from 'react'

export function StatsBar() {
  const [stats, setStats] = useState<{ rolls: number; photos: number } | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <footer className="border-t border-border bg-background/80 backdrop-blur-sm py-2.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{stats.rolls.toLocaleString()}</span>{' '}
          {stats.rolls === 1 ? 'roll' : 'rolls'}
        </span>
        <span className="w-px h-3 bg-border" />
        <span>
          <span className="font-medium text-foreground">{stats.photos.toLocaleString()}</span>{' '}
          {stats.photos === 1 ? 'memory' : 'memories'}
        </span>
      </div>
    </footer>
  )
}
