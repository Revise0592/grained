'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_LIBRARY_BEHAVIOR_SETTINGS, type LibraryBehaviorSettings } from '@/lib/settings'

export default function SettingsPage() {
  const [settings, setSettings] = useState<LibraryBehaviorSettings>(DEFAULT_LIBRARY_BEHAVIOR_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.libraryBehavior) {
          setSettings({
            ...DEFAULT_LIBRARY_BEHAVIOR_SETTINGS,
            ...data.libraryBehavior,
            statsModules: {
              ...DEFAULT_LIBRARY_BEHAVIOR_SETTINGS.statsModules,
              ...data.libraryBehavior.statsModules,
            },
          })
        }
      })
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ libraryBehavior: settings }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data?.libraryBehavior) {
        setSettings(data.libraryBehavior)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }

    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize default library behavior and visible modules.</p>
      </div>

      <section className="space-y-5 rounded-md border border-border p-4 bg-card">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Roll listings</h2>

        <div className="grid gap-2">
          <label className="text-sm text-foreground">Default sort field</label>
          <select
            value={settings.rollSortField}
            onChange={e => setSettings(prev => ({ ...prev, rollSortField: e.target.value as LibraryBehaviorSettings['rollSortField'] }))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="createdAt">Created date</option>
            <option value="dateShotStart">Shot date</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-foreground">Default sort order</label>
          <select
            value={settings.rollSortOrder}
            onChange={e => setSettings(prev => ({ ...prev, rollSortOrder: e.target.value as LibraryBehaviorSettings['rollSortOrder'] }))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-foreground">Default filter preset</label>
          <select
            value={settings.rollFilterPreset}
            onChange={e => setSettings(prev => ({ ...prev, rollFilterPreset: e.target.value as LibraryBehaviorSettings['rollFilterPreset'] }))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Show all rolls</option>
            <option value="cameraStockOnly">Active camera + film stock only</option>
          </select>
        </div>
      </section>

      <section className="space-y-4 rounded-md border border-border p-4 bg-card">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Optional modules</h2>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Show stats bar footer</span>
          <input
            type="checkbox"
            checked={settings.showStatsBar}
            onChange={e => setSettings(prev => ({ ...prev, showStatsBar: e.target.checked }))}
            className="h-4 w-4"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Show roll count</span>
          <input
            type="checkbox"
            checked={settings.statsModules.rolls}
            onChange={e => setSettings(prev => ({
              ...prev,
              statsModules: { ...prev.statsModules, rolls: e.target.checked },
            }))}
            className="h-4 w-4"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Show memory count</span>
          <input
            type="checkbox"
            checked={settings.statsModules.photos}
            onChange={e => setSettings(prev => ({
              ...prev,
              statsModules: { ...prev.statsModules, photos: e.target.checked },
            }))}
            className="h-4 w-4"
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="h-10 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>
    </div>
  )
}
