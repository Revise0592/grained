'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FILM_STOCKS, FILM_FORMATS, DEVELOP_PROCESSES, PUSH_PULL_VALUES } from '@/lib/film-stocks'
import type { Roll } from '@prisma/client'

interface RollFormProps {
  initial?: Partial<Roll>
  rollId?: string
}

const CAMERAS_HINT = ['Nikon F3', 'Canon AE-1', 'Leica M6', 'Contax T2', 'Olympus OM-1', 'Pentax K1000', 'Mamiya RB67', 'Hasselblad 500C']

export function RollForm({ initial, rollId }: RollFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filmQuery, setFilmQuery] = useState(initial?.filmStock ?? '')
  const [showFilmDropdown, setShowFilmDropdown] = useState(false)

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

  const filteredStocks = filmQuery
    ? FILM_STOCKS.filter(s => s.name.toLowerCase().includes(filmQuery.toLowerCase())).slice(0, 8)
    : FILM_STOCKS.slice(0, 8)

  const selectFilmStock = (name: string, iso: number) => {
    setFilmQuery(name)
    setForm(f => ({ ...f, filmStock: name, iso: iso.toString() }))
    setShowFilmDropdown(false)
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
              {showFilmDropdown && filteredStocks.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredStocks.map(s => (
                    <button
                      key={s.name}
                      type="button"
                      onMouseDown={() => selectFilmStock(s.name, s.iso)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between items-center"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-muted-foreground">ISO {s.iso}</span>
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
            <input
              type="text"
              value={form.camera}
              onChange={set('camera')}
              list="cameras-hint"
              placeholder="e.g. Nikon F3, Contax T2"
              className={inputClass}
            />
            <datalist id="cameras-hint">
              {CAMERAS_HINT.map(c => <option key={c} value={c} />)}
            </datalist>
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
