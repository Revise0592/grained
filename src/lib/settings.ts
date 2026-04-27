import type { Prisma } from '@prisma/client'
import { DEVELOP_PROCESSES, FILM_FORMATS } from '@/lib/film-stocks'

export interface Preferences {
  defaultLab: string | null
  defaultDevelopProcess: string | null
  defaultFilmFormat: string | null
  defaultCommonTags: string[]
}

const DEFAULT_PREFERENCES: Preferences = {
  defaultLab: null,
  defaultDevelopProcess: null,
  defaultFilmFormat: null,
  defaultCommonTags: [],
}

function normalizeNullableText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map(normalizeTag).filter(Boolean)))
}

export function parsePreferencesPayload(payload: unknown): { data?: Preferences; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Invalid payload' }
  }

  const record = payload as Record<string, unknown>

  const defaultLab = normalizeNullableText(record.defaultLab)
  if (record.defaultLab !== undefined && defaultLab === undefined) {
    return { error: 'defaultLab must be a string or null' }
  }

  const defaultDevelopProcess = normalizeNullableText(record.defaultDevelopProcess)
  if (record.defaultDevelopProcess !== undefined && defaultDevelopProcess === undefined) {
    return { error: 'defaultDevelopProcess must be a string or null' }
  }
  if (defaultDevelopProcess && !DEVELOP_PROCESSES.includes(defaultDevelopProcess as (typeof DEVELOP_PROCESSES)[number])) {
    return { error: `defaultDevelopProcess must be one of: ${DEVELOP_PROCESSES.join(', ')}` }
  }

  const defaultFilmFormat = normalizeNullableText(record.defaultFilmFormat)
  if (record.defaultFilmFormat !== undefined && defaultFilmFormat === undefined) {
    return { error: 'defaultFilmFormat must be a string or null' }
  }
  if (defaultFilmFormat && !FILM_FORMATS.includes(defaultFilmFormat as (typeof FILM_FORMATS)[number])) {
    return { error: `defaultFilmFormat must be one of: ${FILM_FORMATS.join(', ')}` }
  }

  const rawTags = record.defaultCommonTags
  if (rawTags !== undefined && !Array.isArray(rawTags)) {
    return { error: 'defaultCommonTags must be an array of strings' }
  }

  if (Array.isArray(rawTags) && rawTags.some(tag => typeof tag !== 'string')) {
    return { error: 'defaultCommonTags must be an array of strings' }
  }

  const defaultCommonTags = rawTags ? normalizeTags(rawTags as string[]) : undefined

  return {
    data: {
      defaultLab: defaultLab ?? DEFAULT_PREFERENCES.defaultLab,
      defaultDevelopProcess: defaultDevelopProcess ?? DEFAULT_PREFERENCES.defaultDevelopProcess,
      defaultFilmFormat: defaultFilmFormat ?? DEFAULT_PREFERENCES.defaultFilmFormat,
      defaultCommonTags: defaultCommonTags ?? DEFAULT_PREFERENCES.defaultCommonTags,
    },
  }
}

export function mapDbPreferences(record: { defaultLab: string | null; defaultDevelopProcess: string | null; defaultFilmFormat: string | null; defaultCommonTags: Prisma.JsonValue | null }): Preferences {
  const tags = Array.isArray(record.defaultCommonTags)
    ? record.defaultCommonTags.filter((tag): tag is string => typeof tag === 'string')
    : []

  return {
    defaultLab: record.defaultLab,
    defaultDevelopProcess: record.defaultDevelopProcess,
    defaultFilmFormat: record.defaultFilmFormat,
    defaultCommonTags: normalizeTags(tags),
  }
}

export const EMPTY_PREFERENCES = DEFAULT_PREFERENCES
