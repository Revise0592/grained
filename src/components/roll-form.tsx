'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FILM_STOCKS, FILM_FORMATS, DEVELOP_PROCESSES, PUSH_PULL_VALUES } from '@/lib/film-stocks'
import { normalizeTag, normalizeTags, type Preferences } from '@/lib/settings'
import type { Roll } from '@prisma/client'

interface RollFormProps {
  initial?: Partial<Roll>
  rollId?: string
  initialTags?: string[]
}

interface SavedCamera { id: string; name: string }
interface SavedFilmStock { id: string; name: string; iso: number | null }

export function RollForm({ initial, rollId, initialTags }: RollFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filmQuery, setFilmQuery] = useState(initial?.filmStock ?? '')
  const [showFilmDropdown, setShowFilmDropdown] = useState(false)
  const [cameraQuery, setCameraQuery] = useState(initial?.camera ?? '')
  const [showCameraDropdown, setShowCameraDropdown] = useState(false)

  // Tags state
  const [tags, setTags] = useState<string[]>(initialTags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  // Saved cameras and film stocks
  const [savedCameras, setSavedCameras] = useState<SavedCamera[]>([])
  const [savedFilmStocks, setSavedFilmStocks] = useState<SavedFilmStock[]>([])

  useEffect(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then((data: { name: string }[]) => setAllTags(data.map(t => t.name)))
      .catch(() => {})
    fetch('/api/saved/cameras')
      .then(r => r.json())
      .then(setSavedCameras)
      .catch(() => {})
    fetch('/api/saved/film-stocks')
      .then(r => r.json())
      .then(setSavedFilmStocks)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (rollId) return

    fetch('/api/settings/preferences')
      .then(r => r.json())
      .then((preferences: Preferences) => {
        setForm(prev => ({
          ...prev,
          lab: prev.lab || preferences.defaultLab || '',
          developProcess: prev.developProcess || preferences.defaultDevelopProcess || '',
          filmFormat: prev.filmFormat || preferences.defaultFilmFormat || '',
        }))
        setTags(prev => normalizeTags([...preferences.defaultCommonTags, ...prev]))
      })
      .catch(() => {})
  }, [rollId])

  const tagSuggestions = tagInput
    ? allTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)).slice(0, 6)
    : allTags.filter(t => !tags.includes(t)).slice(0, 6)

  const addTag = (name: string) => {
    const trimmed = normalizeTag(name)
    if (!trimmed || tags.includes(trimmed)) return
    setTags(prev => [...prev, trimmed])
    setTagInput('')
  }

  const removeTag = (name: string) => setTags(prev => prev.filter(t => t !== name))

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    filmStock: initial?.filmStock ?? '',
    filmFormat: initial?.filmFormat ?? '',
    iso: initial?.iso?.toString() ?? '',
    pushPull: initial?.pushPull ?? '0',
    camera: initial?.camera ?? '',
    lens: initial?.lens ?? '',
    dateShotStart: initial?.dateShotStart ? new Date(initial.dateShotStart).toISOString().split('T')[0] : '',
    dateShotEnd: initial?.dateShotEnd ? new Date(initial.dateShotEnd).toISOString().split('T')[0] : '',
    lab: initial?.lab ?? '',
    dateDeveloped: initial?.dateDeveloped ? new Date(initial.dateDeveloped).toISOString().split('T')[0] : '',
    developProcess: initial?.developProcess ?? '',
    notes: initial?.notes ?? '',
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
  }

  // Film stock dropdown: saved stocks always shown, presets only when typing
  const filteredSavedStocks = savedFilmStocks.filter(s =>
    s.name.toLowerCase().includes(filmQuery.toLowerCase())
  )
  const savedStockNames = new Set(savedFilmStocks.map(s => s.name.toLowerCase()))
  const filteredPresets = filmQuery.trim()
    ? FILM_STOCKS.filter(s =>
        s.name.toLowerCase().includes(filmQuery.toLowerCase()) && !savedStockNames.has(s.name.toLowerCase())
      )
    : []
  const filmDropdownItems = [
    ...filteredSavedStocks.map(s => ({ name: s.name, iso: s.iso, saved: true })),
    ...filteredPresets.map(s => ({ name: s.name, iso: s.iso, saved: false })),
  ].slice(0, 10)

  const selectFilmStock = (name: string, iso: number | null) => {
    setFilmQuery(name)
    setForm(f => ({ ...f, filmStock: name, iso: iso?.toString() ?? f.iso }))
    setShowFilmDropdown(false)
  }

  // Camera dropdown: saved cameras
  const filteredCameras = savedCameras.filter(c =>
    c.name.toLowerCase().includes(cameraQuery.toLowerCase())
  )

  const selectCamera = (name: string) => {
    setCameraQuery(name)
    setForm(f => ({ ...f, camera: name }))
    setShowCameraDropdown(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')

    const body = {
      name: form.name,
      description: form.description || null,
      filmStock: form.filmStock || null,
      filmFormat: form.filmFormat || null,
      iso: form.iso ? Number(form.iso) : null,
      pushPull: form.pushPull !== '0' ? form.pushPull : null,
      camera: form.camera || null,
      lens: form.lens || null,
      dateShotStart: form.dateShotStart || null,
      dateShotEnd: form.dateShotEnd || null,
      lab: form.lab || null,
      dateDeveloped: form.dateDeveloped || null,
      developProcess: form.developProcess || null,
      notes: form.notes || null,
      tags,
    }

    const url = rollId ? `/api/rolls/${rollId}` : '/api/rolls'
    const method = rollId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Save failed'); setSaving(false); return }
    router.push(`/rolls/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {error && (
        <div className="px-4 py-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <Section title="Basic Info">
        <Field label="Roll Name" required>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Summer Road Trip, Roll 12"
            className={inputClass}
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={set('description')}
            placeholder="Optional notes about this roll…"
            rows={2}
            className={cn(inputClass, 'resize-none')}
          />
        </Field>
        <Field label="Tags">
          <div className="space-y-2">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-accent/10 text-accent border border-accent/20">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true) }}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) }
                  if (e.key === ',') { e.preventDefault(); addTag(tagInput) }
                }}
                placeholder="Type a tag and press Enter…"
                className={inputClass}
              />
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {tagSuggestions.map(t => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={() => { addTag(t); setShowTagSuggestions(false) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Press Enter or comma to add. Tags are shared across rolls.</p>
          </div>
        </Field>
      </Section>

      <Section title="Film">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Film Stock">
            <div className="relative">
              <input
                type="text"
                value={filmQuery}
                onChange={e => {
                  setFilmQuery(e.target.value)
                  setForm(f => ({ ...f, filmStock: e.target.value }))
                  setShowFilmDropdown(true)
                }}
                onFocus={() => setShowFilmDropdown(true)}
                onBlur={() => setTimeout(() => setShowFilmDropdown(false), 150)}
                placeholder="Search or type film name…"
                className={inputClass}
              />
              {showFilmDropdown && filmDropdownItems.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filmDropdownItems.map(s => (
                    <button
                      key={s.name}
                      type="button"
                      onMouseDown={() => selectFilmStock(s.name, s.iso ?? null)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between items-center gap-2"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {s.iso ? `ISO ${s.iso}` : ''}
                        {s.saved && <span className="ml-1.5 text-accent/70">★</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Format">
            <select value={form.filmFormat} onChange={set('filmFormat')} className={selectClass}>
              <option value="">— select —</option>
              {FILM_FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
          </Field>

          <Field label="ISO">
            <input
              type="number"
              value={form.iso}
              onChange={set('iso')}
              placeholder="e.g. 400"
              className={inputClass}
            />
          </Field>

          <Field label="Push / Pull">
            <select value={form.pushPull} onChange={set('pushPull')} className={selectClass}>
              {PUSH_PULL_VALUES.map(v => <option key={v} value={v}>{v === '0' ? 'None (0)' : v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Camera">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Camera">
            <div className="relative">
              <input
                type="text"
                value={cameraQuery}
                onChange={e => {
                  setCameraQuery(e.target.value)
                  setForm(f => ({ ...f, camera: e.target.value }))
                  setShowCameraDropdown(true)
                }}
                onFocus={() => setShowCameraDropdown(true)}
                onBlur={() => setTimeout(() => setShowCameraDropdown(false), 150)}
                placeholder="e.g. Nikon F3, Contax T2"
                className={inputClass}
              />
              {showCameraDropdown && filteredCameras.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCameras.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => selectCamera(c.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Lens">
            <input
              type="text"
              value={form.lens}
              onChange={set('lens')}
              placeholder="e.g. 50mm f/1.4, 35mm f/2"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section title="Dates">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Shot from">
            <input type="date" value={form.dateShotStart} onChange={set('dateShotStart')} className={inputClass} />
          </Field>
          <Field label="Shot to">
            <input type="date" value={form.dateShotEnd} onChange={set('dateShotEnd')} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title="Development">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lab">
            <input type="text" value={form.lab} onChange={set('lab')} placeholder="e.g. The Darkroom, home dev" className={inputClass} />
          </Field>
          <Field label="Process">
            <select value={form.developProcess} onChange={set('developProcess')} className={selectClass}>
              <option value="">— select —</option>
              {DEVELOP_PROCESSES.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Date Developed">
            <input type="date" value={form.dateDeveloped} onChange={set('dateDeveloped')} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title="Notes">
        <textarea
          value={form.notes}
          onChange={set('notes')}
          placeholder="Anything else worth remembering about this roll…"
          rows={3}
          className={cn(inputClass, 'resize-none')}
        />
      </Section>

      <div className="flex gap-3 justify-end pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {rollId ? 'Save Changes' : 'Create Roll'}
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground block mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground'
const selectClass = cn(inputClass, 'appearance-none cursor-pointer')
