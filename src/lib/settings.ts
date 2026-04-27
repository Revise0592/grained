import type { Prisma } from '@prisma/client'
import { DEVELOP_PROCESSES, FILM_FORMATS } from '@/lib/film-stocks'
import {
  AUTO_ROTATION_POLICIES,
  DUPLICATE_HANDLING_POLICIES,
  type AutoRotationPolicy,
  type DuplicateHandlingPolicy,
} from '@/lib/import-settings'

export interface MetadataDefaults {
  defaultLab: string | null
  defaultDevelopProcess: string | null
  defaultFilmFormat: string | null
  defaultCamera: string | null
  defaultLens: string | null
  defaultCommonTags: string[]
}

export interface ImportDefaults {
  frameNumberStart: number | null
  autoRotationPolicy: AutoRotationPolicy
  duplicateHandling: DuplicateHandlingPolicy
  autoCreateRollFromZip: boolean
  inferShotDatesFromExif: boolean
  defaultTimeZone: string
  preserveOriginalFilenames: boolean
}

export interface DisplayPreferences {
  theme: 'system' | 'light' | 'dark'
  gridDensity: 'compact' | 'comfortable'
  showFrameMetadataInGrid: boolean
  showTagsOnCards: boolean
}

export interface LibraryBehavior {
  saveCamerasAutomatically: boolean
  saveFilmStocksAutomatically: boolean
  allowDuplicateCameraEntries: boolean
  allowDuplicateFilmStockEntries: boolean
}

export interface DataSafety {
  requireDeleteConfirmation: boolean
  keepUploadTempFilesHours: number
  autoBackupBeforeBulkImport: boolean
  allowMetadataOverwriteOnImport: boolean
}

export interface AppSettingsShape {
  metadataDefaults: MetadataDefaults
  importDefaults: ImportDefaults
  displayPreferences: DisplayPreferences
  libraryBehavior: LibraryBehavior
  dataSafety: DataSafety
}

export interface Preferences {
  defaultLab: string | null
  defaultDevelopProcess: string | null
  defaultFilmFormat: string | null
  defaultCommonTags: string[]
}

export interface RollCreationDefaultsInput {
  lab?: string | null
  developProcess?: string | null
  filmFormat?: string | null
  camera?: string | null
  lens?: string | null
  tags?: string[]
}

export type AppSettingsPatch = {
  metadataDefaults?: Partial<MetadataDefaults>
  importDefaults?: Partial<ImportDefaults>
  displayPreferences?: Partial<DisplayPreferences>
  libraryBehavior?: Partial<LibraryBehavior>
  dataSafety?: Partial<DataSafety>
}

export const DEFAULT_APP_SETTINGS: AppSettingsShape = {
  metadataDefaults: {
    defaultLab: null,
    defaultDevelopProcess: 'C-41',
    defaultFilmFormat: null,
    defaultCamera: null,
    defaultLens: null,
    defaultCommonTags: [],
  },
  importDefaults: {
    frameNumberStart: null,
    autoRotationPolicy: 'exif-only',
    duplicateHandling: 'rename',
    autoCreateRollFromZip: true,
    inferShotDatesFromExif: true,
    defaultTimeZone: 'UTC',
    preserveOriginalFilenames: true,
  },
  displayPreferences: {
    theme: 'dark',
    gridDensity: 'comfortable',
    showFrameMetadataInGrid: true,
    showTagsOnCards: true,
  },
  libraryBehavior: {
    saveCamerasAutomatically: true,
    saveFilmStocksAutomatically: true,
    allowDuplicateCameraEntries: false,
    allowDuplicateFilmStockEntries: false,
  },
  dataSafety: {
    requireDeleteConfirmation: true,
    keepUploadTempFilesHours: 24,
    autoBackupBeforeBulkImport: false,
    allowMetadataOverwriteOnImport: true,
  },
}

export const EMPTY_PREFERENCES: Preferences = {
  defaultLab: null,
  defaultDevelopProcess: null,
  defaultFilmFormat: null,
  defaultCommonTags: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function normalizeNullableText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function normalizeInteger(value: unknown, min: number, max: number): number | undefined {
  if (value === null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return undefined
  return parsed
}

function normalizeEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined {
  return typeof value === 'string' && allowed.includes(value as T[number]) ? value as T[number] : undefined
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

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) return undefined
  return normalizeTags(value)
}

function definedEntries<T extends object>(value?: Partial<T>): Partial<T> {
  if (!value) return {}
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
}

export function mergeAppSettings(base: AppSettingsShape, patch?: AppSettingsPatch): AppSettingsShape {
  if (!patch) return base

  return {
    metadataDefaults: { ...base.metadataDefaults, ...definedEntries(patch.metadataDefaults) },
    importDefaults: { ...base.importDefaults, ...definedEntries(patch.importDefaults) },
    displayPreferences: { ...base.displayPreferences, ...definedEntries(patch.displayPreferences) },
    libraryBehavior: { ...base.libraryBehavior, ...definedEntries(patch.libraryBehavior) },
    dataSafety: { ...base.dataSafety, ...definedEntries(patch.dataSafety) },
  }
}

export function normalizeAppSettings(patch?: AppSettingsPatch): AppSettingsShape {
  const merged = mergeAppSettings(DEFAULT_APP_SETTINGS, patch)

  return {
    metadataDefaults: {
      defaultLab: normalizeNullableText(merged.metadataDefaults.defaultLab) ?? null,
      defaultDevelopProcess:
        normalizeEnum(merged.metadataDefaults.defaultDevelopProcess, DEVELOP_PROCESSES) ?? null,
      defaultFilmFormat: normalizeEnum(merged.metadataDefaults.defaultFilmFormat, FILM_FORMATS) ?? null,
      defaultCamera: normalizeNullableText(merged.metadataDefaults.defaultCamera) ?? null,
      defaultLens: normalizeNullableText(merged.metadataDefaults.defaultLens) ?? null,
      defaultCommonTags: normalizeTags(merged.metadataDefaults.defaultCommonTags ?? []),
    },
    importDefaults: {
      frameNumberStart: normalizeInteger(merged.importDefaults.frameNumberStart, 0, 9999) ?? null,
      autoRotationPolicy:
        normalizeEnum(merged.importDefaults.autoRotationPolicy, AUTO_ROTATION_POLICIES) ??
        DEFAULT_APP_SETTINGS.importDefaults.autoRotationPolicy,
      duplicateHandling:
        normalizeEnum(merged.importDefaults.duplicateHandling, DUPLICATE_HANDLING_POLICIES) ??
        DEFAULT_APP_SETTINGS.importDefaults.duplicateHandling,
      autoCreateRollFromZip:
        normalizeBoolean(merged.importDefaults.autoCreateRollFromZip) ??
        DEFAULT_APP_SETTINGS.importDefaults.autoCreateRollFromZip,
      inferShotDatesFromExif:
        normalizeBoolean(merged.importDefaults.inferShotDatesFromExif) ??
        DEFAULT_APP_SETTINGS.importDefaults.inferShotDatesFromExif,
      defaultTimeZone: normalizeNullableText(merged.importDefaults.defaultTimeZone) ?? 'UTC',
      preserveOriginalFilenames:
        normalizeBoolean(merged.importDefaults.preserveOriginalFilenames) ??
        DEFAULT_APP_SETTINGS.importDefaults.preserveOriginalFilenames,
    },
    displayPreferences: {
      theme: normalizeEnum(merged.displayPreferences.theme, ['system', 'light', 'dark'] as const) ?? 'dark',
      gridDensity: normalizeEnum(merged.displayPreferences.gridDensity, ['compact', 'comfortable'] as const) ?? 'comfortable',
      showFrameMetadataInGrid:
        normalizeBoolean(merged.displayPreferences.showFrameMetadataInGrid) ??
        DEFAULT_APP_SETTINGS.displayPreferences.showFrameMetadataInGrid,
      showTagsOnCards:
        normalizeBoolean(merged.displayPreferences.showTagsOnCards) ??
        DEFAULT_APP_SETTINGS.displayPreferences.showTagsOnCards,
    },
    libraryBehavior: {
      saveCamerasAutomatically:
        normalizeBoolean(merged.libraryBehavior.saveCamerasAutomatically) ??
        DEFAULT_APP_SETTINGS.libraryBehavior.saveCamerasAutomatically,
      saveFilmStocksAutomatically:
        normalizeBoolean(merged.libraryBehavior.saveFilmStocksAutomatically) ??
        DEFAULT_APP_SETTINGS.libraryBehavior.saveFilmStocksAutomatically,
      allowDuplicateCameraEntries:
        normalizeBoolean(merged.libraryBehavior.allowDuplicateCameraEntries) ??
        DEFAULT_APP_SETTINGS.libraryBehavior.allowDuplicateCameraEntries,
      allowDuplicateFilmStockEntries:
        normalizeBoolean(merged.libraryBehavior.allowDuplicateFilmStockEntries) ??
        DEFAULT_APP_SETTINGS.libraryBehavior.allowDuplicateFilmStockEntries,
    },
    dataSafety: {
      requireDeleteConfirmation:
        normalizeBoolean(merged.dataSafety.requireDeleteConfirmation) ??
        DEFAULT_APP_SETTINGS.dataSafety.requireDeleteConfirmation,
      keepUploadTempFilesHours:
        normalizeInteger(merged.dataSafety.keepUploadTempFilesHours, 1, 720) ??
        DEFAULT_APP_SETTINGS.dataSafety.keepUploadTempFilesHours,
      autoBackupBeforeBulkImport:
        normalizeBoolean(merged.dataSafety.autoBackupBeforeBulkImport) ??
        DEFAULT_APP_SETTINGS.dataSafety.autoBackupBeforeBulkImport,
      allowMetadataOverwriteOnImport:
        normalizeBoolean(merged.dataSafety.allowMetadataOverwriteOnImport) ??
        DEFAULT_APP_SETTINGS.dataSafety.allowMetadataOverwriteOnImport,
    },
  }
}

export function parseAppSettingsPayload(payload: unknown): { data?: AppSettingsShape; error?: string } {
  if (!isRecord(payload)) return { error: 'Invalid settings payload' }

  const metadataDefaults = isRecord(payload.metadataDefaults) ? payload.metadataDefaults : {}
  const importDefaults = isRecord(payload.importDefaults) ? payload.importDefaults : {}
  const displayPreferences = isRecord(payload.displayPreferences) ? payload.displayPreferences : {}
  const libraryBehavior = isRecord(payload.libraryBehavior) ? payload.libraryBehavior : {}
  const dataSafety = isRecord(payload.dataSafety) ? payload.dataSafety : {}

  if (
    metadataDefaults.defaultDevelopProcess &&
    !DEVELOP_PROCESSES.includes(metadataDefaults.defaultDevelopProcess as (typeof DEVELOP_PROCESSES)[number])
  ) {
    return { error: `defaultDevelopProcess must be one of: ${DEVELOP_PROCESSES.join(', ')}` }
  }
  if (
    metadataDefaults.defaultFilmFormat &&
    !FILM_FORMATS.includes(metadataDefaults.defaultFilmFormat as (typeof FILM_FORMATS)[number])
  ) {
    return { error: `defaultFilmFormat must be one of: ${FILM_FORMATS.join(', ')}` }
  }
  if (
    importDefaults.autoRotationPolicy &&
    !AUTO_ROTATION_POLICIES.includes(importDefaults.autoRotationPolicy as AutoRotationPolicy)
  ) {
    return { error: `autoRotationPolicy must be one of: ${AUTO_ROTATION_POLICIES.join(', ')}` }
  }
  if (
    importDefaults.duplicateHandling &&
    !DUPLICATE_HANDLING_POLICIES.includes(importDefaults.duplicateHandling as DuplicateHandlingPolicy)
  ) {
    return { error: `duplicateHandling must be one of: ${DUPLICATE_HANDLING_POLICIES.join(', ')}` }
  }

  return {
    data: normalizeAppSettings({
      metadataDefaults: {
        defaultLab: normalizeNullableText(metadataDefaults.defaultLab),
        defaultDevelopProcess: normalizeNullableText(metadataDefaults.defaultDevelopProcess),
        defaultFilmFormat: normalizeNullableText(metadataDefaults.defaultFilmFormat),
        defaultCamera: normalizeNullableText(metadataDefaults.defaultCamera),
        defaultLens: normalizeNullableText(metadataDefaults.defaultLens),
        defaultCommonTags: normalizeStringArray(metadataDefaults.defaultCommonTags),
      },
      importDefaults: {
        frameNumberStart:
          importDefaults.frameNumberStart === null
            ? null
            : normalizeInteger(importDefaults.frameNumberStart, 0, 9999),
        autoRotationPolicy: normalizeEnum(importDefaults.autoRotationPolicy, AUTO_ROTATION_POLICIES),
        duplicateHandling: normalizeEnum(importDefaults.duplicateHandling, DUPLICATE_HANDLING_POLICIES),
        autoCreateRollFromZip: normalizeBoolean(importDefaults.autoCreateRollFromZip),
        inferShotDatesFromExif: normalizeBoolean(importDefaults.inferShotDatesFromExif),
        defaultTimeZone: normalizeNullableText(importDefaults.defaultTimeZone) ?? undefined,
        preserveOriginalFilenames: normalizeBoolean(importDefaults.preserveOriginalFilenames),
      },
      displayPreferences: {
        theme: normalizeEnum(displayPreferences.theme, ['system', 'light', 'dark'] as const),
        gridDensity: normalizeEnum(displayPreferences.gridDensity, ['compact', 'comfortable'] as const),
        showFrameMetadataInGrid: normalizeBoolean(displayPreferences.showFrameMetadataInGrid),
        showTagsOnCards: normalizeBoolean(displayPreferences.showTagsOnCards),
      },
      libraryBehavior: {
        saveCamerasAutomatically: normalizeBoolean(libraryBehavior.saveCamerasAutomatically),
        saveFilmStocksAutomatically: normalizeBoolean(libraryBehavior.saveFilmStocksAutomatically),
        allowDuplicateCameraEntries: normalizeBoolean(libraryBehavior.allowDuplicateCameraEntries),
        allowDuplicateFilmStockEntries: normalizeBoolean(libraryBehavior.allowDuplicateFilmStockEntries),
      },
      dataSafety: {
        requireDeleteConfirmation: normalizeBoolean(dataSafety.requireDeleteConfirmation),
        keepUploadTempFilesHours: normalizeInteger(dataSafety.keepUploadTempFilesHours, 1, 720),
        autoBackupBeforeBulkImport: normalizeBoolean(dataSafety.autoBackupBeforeBulkImport),
        allowMetadataOverwriteOnImport: normalizeBoolean(dataSafety.allowMetadataOverwriteOnImport),
      },
    }),
  }
}

export function mapDbAppSettings(record: {
  metadataDefaults: Prisma.JsonValue
  importDefaults: Prisma.JsonValue
  displayPreferences: Prisma.JsonValue
  libraryBehavior: Prisma.JsonValue
  dataSafety: Prisma.JsonValue
}): AppSettingsShape {
  return normalizeAppSettings({
    metadataDefaults: asRecord(record.metadataDefaults) as Partial<MetadataDefaults> | undefined,
    importDefaults: asRecord(record.importDefaults) as Partial<ImportDefaults> | undefined,
    displayPreferences: asRecord(record.displayPreferences) as Partial<DisplayPreferences> | undefined,
    libraryBehavior: asRecord(record.libraryBehavior) as Partial<LibraryBehavior> | undefined,
    dataSafety: asRecord(record.dataSafety) as Partial<DataSafety> | undefined,
  })
}

export function preferencesFromAppSettings(settings: AppSettingsShape): Preferences {
  return {
    defaultLab: settings.metadataDefaults.defaultLab,
    defaultDevelopProcess: settings.metadataDefaults.defaultDevelopProcess,
    defaultFilmFormat: settings.metadataDefaults.defaultFilmFormat,
    defaultCommonTags: settings.metadataDefaults.defaultCommonTags,
  }
}

export function applyMetadataDefaultsToRoll<T extends RollCreationDefaultsInput>(
  input: T,
  settings: AppSettingsShape,
): T & RollCreationDefaultsInput {
  const { metadataDefaults } = settings

  return {
    ...input,
    lab: input.lab === undefined ? metadataDefaults.defaultLab : input.lab,
    developProcess:
      input.developProcess === undefined ? metadataDefaults.defaultDevelopProcess : input.developProcess,
    filmFormat: input.filmFormat === undefined ? metadataDefaults.defaultFilmFormat : input.filmFormat,
    camera: input.camera === undefined ? metadataDefaults.defaultCamera : input.camera,
    lens: input.lens === undefined ? metadataDefaults.defaultLens : input.lens,
    tags: input.tags === undefined ? metadataDefaults.defaultCommonTags : input.tags,
  }
}

export function parsePreferencesPayload(payload: unknown): { data?: Preferences; error?: string } {
  if (!isRecord(payload)) return { error: 'Invalid payload' }

  const defaultLab = normalizeNullableText(payload.defaultLab)
  if (payload.defaultLab !== undefined && defaultLab === undefined) {
    return { error: 'defaultLab must be a string or null' }
  }

  const defaultDevelopProcess = normalizeNullableText(payload.defaultDevelopProcess)
  if (payload.defaultDevelopProcess !== undefined && defaultDevelopProcess === undefined) {
    return { error: 'defaultDevelopProcess must be a string or null' }
  }
  if (defaultDevelopProcess && !DEVELOP_PROCESSES.includes(defaultDevelopProcess as (typeof DEVELOP_PROCESSES)[number])) {
    return { error: `defaultDevelopProcess must be one of: ${DEVELOP_PROCESSES.join(', ')}` }
  }

  const defaultFilmFormat = normalizeNullableText(payload.defaultFilmFormat)
  if (payload.defaultFilmFormat !== undefined && defaultFilmFormat === undefined) {
    return { error: 'defaultFilmFormat must be a string or null' }
  }
  if (defaultFilmFormat && !FILM_FORMATS.includes(defaultFilmFormat as (typeof FILM_FORMATS)[number])) {
    return { error: `defaultFilmFormat must be one of: ${FILM_FORMATS.join(', ')}` }
  }

  const defaultCommonTags = normalizeStringArray(payload.defaultCommonTags)
  if (payload.defaultCommonTags !== undefined && defaultCommonTags === undefined) {
    return { error: 'defaultCommonTags must be an array of strings' }
  }

  return {
    data: {
      defaultLab: defaultLab ?? EMPTY_PREFERENCES.defaultLab,
      defaultDevelopProcess: defaultDevelopProcess ?? EMPTY_PREFERENCES.defaultDevelopProcess,
      defaultFilmFormat: defaultFilmFormat ?? EMPTY_PREFERENCES.defaultFilmFormat,
      defaultCommonTags: defaultCommonTags ?? EMPTY_PREFERENCES.defaultCommonTags,
    },
  }
}

export function mapDbPreferences(record: {
  defaultLab: string | null
  defaultDevelopProcess: string | null
  defaultFilmFormat: string | null
  defaultCommonTags: Prisma.JsonValue | null
}): Preferences {
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
