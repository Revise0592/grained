'use client'

import { useEffect, useState } from 'react'

type SettingsState = {
  softDeleteRetentionDays: number
  backupReminderEnabled: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    softDeleteRetentionDays: 30,
    backupReminderEnabled: true,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setSettings({
          softDeleteRetentionDays: data.softDeleteRetentionDays,
          backupReminderEnabled: data.backupReminderEnabled,
        })
      })
      .catch(() => {})
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        setMessage(err?.error ?? 'Failed to save settings')
      } else {
        setMessage('Settings saved')
      }
    } finally {
      setSaving(false)
    }
  }

  const exportBackup = async () => {
    const response = await fetch('/api/settings/backup/export')
    if (!response.ok) {
      setMessage('Export failed')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grained-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file: File) => {
    setImporting(true)
    setMessage('')

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const response = await fetch('/api/settings/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        setMessage(err?.error ?? 'Import failed')
      } else {
        setMessage('Backup imported successfully')
      }
    } catch {
      setMessage('Could not parse backup file')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage retention and backup preferences.</p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">Soft-delete retention window</span>
          <select
            className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={settings.softDeleteRetentionDays}
            onChange={(e) => setSettings((prev) => ({ ...prev, softDeleteRetentionDays: Number(e.target.value) }))}
          >
            <option value={0}>0 days (immediate purge)</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={settings.backupReminderEnabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, backupReminderEnabled: e.target.checked }))}
          />
          Backup reminder enabled
        </label>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Data Safety</h2>
        <p className="text-sm text-muted-foreground">Create or restore a complete JSON backup of your archive metadata.</p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportBackup}
            className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted"
          >
            Export backup
          </button>

          <label className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted cursor-pointer">
            {importing ? 'Importing…' : 'Import backup'}
            <input
              type="file"
              accept="application/json"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importBackup(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </section>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
