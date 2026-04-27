'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { DEFAULT_LIBRARY_BEHAVIOR_SETTINGS, type LibraryBehaviorSettings } from '@/lib/settings'

export function StatsBar() {
  const pathname = usePathname()
  const [stats, setStats] = useState<{ rolls: number; photos: number } | null>(null)
  const [settings, setSettings] = useState<LibraryBehaviorSettings>(DEFAULT_LIBRARY_BEHAVIOR_SETTINGS)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setStats(data))
      .catch(() => {})

    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.libraryBehavior) {
          setSettings({ ...DEFAULT_LIBRARY_BEHAVIOR_SETTINGS, ...data.libraryBehavior })
        }
      })
      .catch(() => {})
  }, [])

  if (pathname === '/login') return null
  if (!settings.showStatsBar) return null
  if (!stats) return null

  const showRolls = settings.statsModules.rolls
  const showPhotos = settings.statsModules.photos

  if (!showRolls && !showPhotos) return null

  return (
    <footer className="border-t border-border bg-background/80 backdrop-blur-sm py-2.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        {showRolls && (
          <span>
            <span className="font-medium text-foreground">{stats.rolls.toLocaleString()}</span>{' '}
            {stats.rolls === 1 ? 'roll' : 'rolls'}
          </span>
        )}

        {showRolls && showPhotos && <span className="w-px h-3 bg-border" />}

        {showPhotos && (
          <span>
            <span className="font-medium text-foreground">{stats.photos.toLocaleString()}</span>{' '}
            {stats.photos === 1 ? 'memory' : 'memories'}
          </span>
        )}
      </div>
    </footer>
  )
}
