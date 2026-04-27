'use client'

import { useState } from 'react'
import {
  CARD_DENSITIES,
  DATE_DISPLAY_FORMATS,
  THEME_MODES,
  type DisplaySettings,
} from '@/lib/display-settings'
import { useDisplaySettings } from '@/components/theme-provider'

const labels: Record<keyof DisplaySettings, Record<string, string>> = {
  themeMode: {
    dark: 'Dark',
    light: 'Light',
    system: 'System',
  },
  cardDensity: {
    comfortable: 'Comfortable',
    compact: 'Compact',
  },
  dateDisplayFormat: {
    relative: 'Relative',
    'locale-short': 'Locale short',
    iso: 'ISO',
  },
}

export default function SettingsPage() {
  const { settings, setSettings, loading } = useDisplaySettings()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const updateSetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings/display', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const updated = await response.json() as DisplaySettings
      setSettings(updated)
      setMessage('Saved.')
    } catch {
      setMessage('Could not save right now.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground mt-1">Display preferences are saved for this archive.</p>

      <div className="mt-6 rounded-lg border border-border bg-card p-4 sm:p-5 space-y-5">
        <SettingRow
          label="Theme mode"
          value={settings.themeMode}
          disabled={loading || saving}
          options={THEME_MODES}
          optionLabel={(v) => labels.themeMode[v]}
          onChange={(value) => updateSetting('themeMode', value)}
        />

        <SettingRow
          label="Card density"
          value={settings.cardDensity}
          disabled={loading || saving}
          options={CARD_DENSITIES}
          optionLabel={(v) => labels.cardDensity[v]}
          onChange={(value) => updateSetting('cardDensity', value)}
        />

        <SettingRow
          label="Date display"
          value={settings.dateDisplayFormat}
          disabled={loading || saving}
          options={DATE_DISPLAY_FORMATS}
          optionLabel={(v) => labels.dateDisplayFormat[v]}
          onChange={(value) => updateSetting('dateDisplayFormat', value)}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={loading || saving}
            className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      </div>
    </div>
  )
}

function SettingRow<T extends string>({
  label,
  value,
  options,
  optionLabel,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: readonly T[]
  optionLabel: (value: T) => string
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1.5 w-full sm:w-64 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}
