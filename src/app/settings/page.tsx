'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SettingsValues } from '@/lib/settings'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [settings, setSettings] = useState<SettingsValues | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    setMessage(null)
    setErrors([])
    const res = await fetch('/api/settings')
    if (!res.ok) throw new Error('Unable to load settings')
    const data = await res.json() as { settings: SettingsValues }
    setSettings(data.settings)
    setLoading(false)
  }

  useEffect(() => {
    load().catch((err: Error) => {
      setMessage(err.message)
      setLoading(false)
    })
  }, [])

  const canSubmit = useMemo(() => !!settings && !loading && !saving, [settings, loading, saving])

  const update = <G extends keyof SettingsValues, K extends keyof SettingsValues[G]>(
    group: G,
    key: K,
    value: SettingsValues[G][K],
  ) => {
    setSettings((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [group]: { ...prev[group], [key]: value },
      }
    })
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    setMessage(null)
    setErrors([])

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })

    const data = await res.json()
    if (!res.ok) {
      setErrors(Array.isArray(data.details) ? data.details : [data.message ?? 'Save failed'])
      setSaving(false)
      return
    }

    setSettings(data.settings)
    setMessage('Settings saved.')
    setSaving(false)
  }


  const exportBackup = async () => {
    const res = await fetch('/api/settings/backup')
    if (!res.ok) {
      setMessage('Backup export failed.')
      return
    }
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `grained-settings-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file: File) => {
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors(Array.isArray(data.details) ? data.details : [data.message ?? 'Import failed'])
        return
      }
      setSettings(data.settings)
      setMessage('Settings backup imported.')
      setErrors([])
    } catch {
      setErrors(['Selected file is not valid JSON.'])
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-sm text-muted-foreground">Loading settings…</div>
  }

  if (!settings) {
    return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-sm text-destructive">{message ?? 'Failed to load settings.'}</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Control metadata, import behavior, display defaults, library cleanup, and safety checks.</p>
      </div>

      <Section title="Metadata" description="Branding used in site title and manifest metadata.">
        <TextInput label="App name" value={settings.metadata.appName} onChange={(v) => update('metadata', 'appName', v)} />
        <TextInput label="App description" value={settings.metadata.appDescription} onChange={(v) => update('metadata', 'appDescription', v)} />
      </Section>

      <Section title="Import" description="Controls how new roll data updates the shared library.">
        <Toggle
          label="Auto-save cameras and film stocks"
          checked={settings.import.autoSaveLibraryItems}
          onChange={(v) => update('import', 'autoSaveLibraryItems', v)}
        />
        <Toggle
          label="Allow duplicate filenames"
          checked={settings.import.allowDuplicateFilenames}
          onChange={(v) => update('import', 'allowDuplicateFilenames', v)}
        />
      </Section>

      <Section title="Display" description="Visual defaults applied at layout render time.">
        <label className="text-sm text-foreground block">
          Theme preference
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={settings.display.defaultTheme}
            onChange={(e) => update('display', 'defaultTheme', e.target.value as SettingsValues['display']['defaultTheme'])}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </label>
        <Toggle
          label="Show footer stats bar"
          checked={settings.display.showStatsBar}
          onChange={(v) => update('display', 'showStatsBar', v)}
        />
      </Section>

      <Section title="Library" description="Archival list behavior for saved cameras and film stocks.">
        <Toggle
          label="Show archived library items"
          checked={settings.library.showArchivedItems}
          onChange={(v) => update('library', 'showArchivedItems', v)}
        />
        <Toggle
          label="Enable soft-delete"
          checked={settings.library.enableSoftDelete}
          onChange={(v) => update('library', 'enableSoftDelete', v)}
        />
      </Section>

      <Section title="Safety" description="Destructive action and metadata visibility safeguards.">
        <Toggle
          label="Require confirmation for destructive actions"
          checked={settings.safety.confirmDestructiveActions}
          onChange={(v) => update('safety', 'confirmDestructiveActions', v)}
        />
        <Toggle
          label="Redact sensitive metadata in UI"
          checked={settings.safety.redactSensitiveMetadata}
          onChange={(v) => update('safety', 'redactSensitiveMetadata', v)}
        />
      </Section>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {errors.length > 0 && (
        <ul className="text-sm text-destructive list-disc pl-5 space-y-1">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={!canSubmit}
          className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        <button
          onClick={() => load().catch(() => setMessage('Unable to reload settings'))}
          disabled={saving}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
        >
          Reset
        </button>
        <button
          onClick={exportBackup}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
        >
          Export backup
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
        >
          Import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) importBackup(file)
            e.currentTarget.value = ''
          }}
        />
      </div>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-foreground block">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
