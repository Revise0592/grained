'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Loader2, RotateCcw, Save } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { inputClass, selectClass } from '@/lib/ui'
import { DEVELOP_PROCESSES, FILM_FORMATS } from '@/lib/film-stocks'
import { DEFAULT_APP_SETTINGS, normalizeTags, type AppSettingsShape } from '@/lib/settings'
import { THEME_PALETTE_OPTIONS } from '@/lib/themes'

const AUTO_ROTATION_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'exif-only', label: 'EXIF only' },
  { value: 'force-upright', label: 'Force upright' },
] as const

const DUPLICATE_OPTIONS = [
  { value: 'skip', label: 'Skip' },
  { value: 'rename', label: 'Rename' },
  { value: 'replace', label: 'Replace' },
] as const

type SectionProps = {
  title: string
  children: ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="grid gap-4 py-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-10 md:py-8">
      <h2 className="text-[15px] font-medium text-foreground">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 min-w-0">{children}</div>
    </section>
  )
}

type Palette = AppSettingsShape['displayPreferences']['palette']

/** Each swatch renders inside its own palette scope, light half and dark half. */
function PalettePicker({ value, onChange }: { value: Palette; onChange: (palette: Palette) => void }) {
  return (
    <section className="grid gap-4 py-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-10 md:py-8">
      <h2 id="palette-h" className="text-[15px] font-medium text-foreground">Palette</h2>
      <div role="radiogroup" aria-labelledby="palette-h" className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
        {THEME_PALETTE_OPTIONS.map(option => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'card-link group text-left rounded-lg border bg-card p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected ? 'border-foreground' : 'border-border hover:border-foreground/30',
              )}
            >
              <span className="grid grid-cols-2 overflow-hidden rounded-md border border-border" aria-hidden>
                {(['', 'dark'] as const).map(mode => (
                  <span key={mode || 'light'} data-palette={option.value} className={cn(mode, 'block bg-background p-2')}>
                    <span className="block h-10 rounded-sm bg-card border border-border p-1.5">
                      <span className="block h-1.5 w-3/4 rounded-full bg-foreground/80" />
                      <span className="mt-1 block h-1.5 w-1/2 rounded-full bg-muted-foreground/60" />
                    </span>
                    <span className="mt-1.5 block h-2 w-8 rounded-sm bg-accent" />
                  </span>
                ))}
              </span>
              <span className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
                <span className="text-sm text-foreground truncate">{option.label}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden />}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={cn('block space-y-1.5', wide && 'sm:col-span-2')}>
      <span className="block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="sm:col-span-2 flex min-h-11 items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-[15px] text-foreground">{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}


export default function SettingsPage() {
  const { setTheme } = useTheme()
  const [settings, setSettings] = useState<AppSettingsShape>(DEFAULT_APP_SETTINGS)
  const [tagText, setTagText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load settings')))
      .then((data: AppSettingsShape) => {
        if (!alive) return
        setSettings(data)
        setTagText(data.metadataDefaults.defaultCommonTags.join(', '))
      })
      .catch(err => {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load settings')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (loading) return

    setTheme(settings.displayPreferences.theme)
    document.documentElement.dataset.palette = settings.displayPreferences.palette
  }, [loading, setTheme, settings.displayPreferences.palette, settings.displayPreferences.theme])

  const normalizedTags = useMemo(() => normalizeTags(tagText.split(',')), [tagText])

  const save = async () => {
    setSaving(true)
    setStatus('')
    setError('')

    const payload: AppSettingsShape = {
      ...settings,
      metadataDefaults: {
        ...settings.metadataDefaults,
        defaultCommonTags: normalizedTags,
      },
    }

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to save settings')
      setSaving(false)
      return
    }

    setSettings(data)
    setTagText(data.metadataDefaults.defaultCommonTags.join(', '))
    setTheme(data.displayPreferences.theme)
    setStatus('Settings saved')
    setSaving(false)
  }

  const reset = () => {
    setSettings(DEFAULT_APP_SETTINGS)
    setTagText(DEFAULT_APP_SETTINGS.metadataDefaults.defaultCommonTags.join(', '))
    setStatus('')
    setError('')
  }

  const update = <K extends keyof AppSettingsShape>(
    section: K,
    next: Partial<AppSettingsShape[K]>,
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...next,
      },
    }))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading settings…
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pt-10 [&>section:not(:last-child)]:border-b [&>section]:border-border">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-border">
        <div className="space-y-2">
          <h1 className="text-[28px] leading-9 sm:text-[40px] sm:leading-[48px] font-medium tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground">Defaults for new rolls, imports and how the archive looks</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={reset}
            className="btn btn-secondary"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </header>

      {(error || status) && (
        <div
          className={cn(
            'mt-6 rounded-md px-4 py-3 text-sm',
            error ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent-ink',
          )}
        >
          {error || status}
        </div>
      )}

      <Section title="Metadata defaults">
        <Field label="Lab">
          <input
            value={settings.metadataDefaults.defaultLab ?? ''}
            onChange={e => update('metadataDefaults', { defaultLab: e.target.value || null })}
            className={inputClass}
          />
        </Field>
        <Field label="Develop process">
          <select
            value={settings.metadataDefaults.defaultDevelopProcess ?? ''}
            onChange={e => update('metadataDefaults', { defaultDevelopProcess: e.target.value || null })}
            className={selectClass}
          >
            <option value="">No default</option>
            {DEVELOP_PROCESSES.map(process => <option key={process} value={process}>{process}</option>)}
          </select>
        </Field>
        <Field label="Film format">
          <select
            value={settings.metadataDefaults.defaultFilmFormat ?? ''}
            onChange={e => update('metadataDefaults', { defaultFilmFormat: e.target.value || null })}
            className={selectClass}
          >
            <option value="">No default</option>
            {FILM_FORMATS.map(format => <option key={format} value={format}>{format}</option>)}
          </select>
        </Field>
        <Field label="Camera">
          <input
            value={settings.metadataDefaults.defaultCamera ?? ''}
            onChange={e => update('metadataDefaults', { defaultCamera: e.target.value || null })}
            className={inputClass}
          />
        </Field>
        <Field label="Lens">
          <input
            value={settings.metadataDefaults.defaultLens ?? ''}
            onChange={e => update('metadataDefaults', { defaultLens: e.target.value || null })}
            className={inputClass}
          />
        </Field>
        <Field label="Common tags" wide>
          <input
            value={tagText}
            onChange={e => setTagText(e.target.value)}
            placeholder="travel, family, bw"
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Import defaults">
        <Field label="First frame number">
          <input
            type="number"
            min="0"
            value={settings.importDefaults.frameNumberStart ?? ''}
            onChange={e => update('importDefaults', { frameNumberStart: e.target.value ? Number(e.target.value) : null })}
            className={inputClass}
          />
        </Field>
        <Field label="Auto rotation">
          <select
            value={settings.importDefaults.autoRotationPolicy}
            onChange={e => update('importDefaults', { autoRotationPolicy: e.target.value as AppSettingsShape['importDefaults']['autoRotationPolicy'] })}
            className={selectClass}
          >
            {AUTO_ROTATION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Duplicates">
          <select
            value={settings.importDefaults.duplicateHandling}
            onChange={e => update('importDefaults', { duplicateHandling: e.target.value as AppSettingsShape['importDefaults']['duplicateHandling'] })}
            className={selectClass}
          >
            {DUPLICATE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Display">
        <Field label="Theme">
          <select
            value={settings.displayPreferences.theme}
            onChange={e => update('displayPreferences', { theme: e.target.value as AppSettingsShape['displayPreferences']['theme'] })}
            className={selectClass}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </Field>
        <Field label="Grid density">
          <select
            value={settings.displayPreferences.gridDensity}
            onChange={e => update('displayPreferences', { gridDensity: e.target.value as AppSettingsShape['displayPreferences']['gridDensity'] })}
            className={selectClass}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </Field>
        <Toggle
          label="Show frame metadata in grid"
          checked={settings.displayPreferences.showFrameMetadataInGrid}
          onChange={checked => update('displayPreferences', { showFrameMetadataInGrid: checked })}
        />
        <Toggle
          label="Show tags on cards"
          checked={settings.displayPreferences.showTagsOnCards}
          onChange={checked => update('displayPreferences', { showTagsOnCards: checked })}
        />
      </Section>

      <PalettePicker
        value={settings.displayPreferences.palette}
        onChange={palette => update('displayPreferences', { palette })}
      />

      <Section title="Library behaviour">
        <Toggle
          label="Save cameras automatically"
          checked={settings.libraryBehavior.saveCamerasAutomatically}
          onChange={checked => update('libraryBehavior', { saveCamerasAutomatically: checked })}
        />
        <Toggle
          label="Save film stocks automatically"
          checked={settings.libraryBehavior.saveFilmStocksAutomatically}
          onChange={checked => update('libraryBehavior', { saveFilmStocksAutomatically: checked })}
        />
      </Section>

      <Section title="Data safety">
        <Field label="Keep upload temp files (hours)">
          <input
            type="number"
            min="1"
            max="720"
            value={settings.dataSafety.keepUploadTempFilesHours}
            onChange={e => update('dataSafety', { keepUploadTempFilesHours: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>
        <Toggle
          label="Require delete confirmation"
          checked={settings.dataSafety.requireDeleteConfirmation}
          onChange={checked => update('dataSafety', { requireDeleteConfirmation: checked })}
        />
      </Section>
    </div>
  )
}
