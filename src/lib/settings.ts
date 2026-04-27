import type { AppSettings } from '@prisma/client'

export interface SettingsValues {
  metadata: {
    appName: string
    appDescription: string
  }
  import: {
    autoSaveLibraryItems: boolean
    allowDuplicateFilenames: boolean
  }
  display: {
    defaultTheme: 'dark' | 'light' | 'system'
    showStatsBar: boolean
  }
  library: {
    showArchivedItems: boolean
    enableSoftDelete: boolean
  }
  safety: {
    confirmDestructiveActions: boolean
    redactSensitiveMetadata: boolean
  }
}

export const DEFAULT_SETTINGS: SettingsValues = {
  metadata: {
    appName: 'Grained',
    appDescription: 'Film photography archive',
  },
  import: {
    autoSaveLibraryItems: true,
    allowDuplicateFilenames: false,
  },
  display: {
    defaultTheme: 'dark',
    showStatsBar: true,
  },
  library: {
    showArchivedItems: false,
    enableSoftDelete: true,
  },
  safety: {
    confirmDestructiveActions: true,
    redactSensitiveMetadata: false,
  },
}

export function withSettingsDefaults(input?: AppSettings | null): SettingsValues {
  return {
    metadata: {
      appName: normalizeString(input?.appName, DEFAULT_SETTINGS.metadata.appName),
      appDescription: normalizeString(input?.appDescription, DEFAULT_SETTINGS.metadata.appDescription),
    },
    import: {
      autoSaveLibraryItems: normalizeBoolean(input?.autoSaveLibraryItems, DEFAULT_SETTINGS.import.autoSaveLibraryItems),
      allowDuplicateFilenames: normalizeBoolean(input?.allowDuplicateFilenames, DEFAULT_SETTINGS.import.allowDuplicateFilenames),
    },
    display: {
      defaultTheme: normalizeTheme(input?.defaultTheme),
      showStatsBar: normalizeBoolean(input?.showStatsBar, DEFAULT_SETTINGS.display.showStatsBar),
    },
    library: {
      showArchivedItems: normalizeBoolean(input?.showArchivedItems, DEFAULT_SETTINGS.library.showArchivedItems),
      enableSoftDelete: normalizeBoolean(input?.enableSoftDelete, DEFAULT_SETTINGS.library.enableSoftDelete),
    },
    safety: {
      confirmDestructiveActions: normalizeBoolean(
        input?.confirmDestructiveActions,
        DEFAULT_SETTINGS.safety.confirmDestructiveActions,
      ),
      redactSensitiveMetadata: normalizeBoolean(input?.redactSensitiveMetadata, DEFAULT_SETTINGS.safety.redactSensitiveMetadata),
    },
  }
}

export function validateSettingsPayload(payload: unknown): { data?: SettingsValues; errors?: string[] } {
  const errors: string[] = []
  if (!payload || typeof payload !== 'object') {
    return { errors: ['Request body must be an object.'] }
  }

  const root = payload as Record<string, unknown>
  const next: SettingsValues = structuredClone(DEFAULT_SETTINGS)

  validateMetadata(root.metadata, next, errors)
  validateImport(root.import, next, errors)
  validateDisplay(root.display, next, errors)
  validateLibrary(root.library, next, errors)
  validateSafety(root.safety, next, errors)

  return errors.length > 0 ? { errors } : { data: next }
}

function validateMetadata(input: unknown, next: SettingsValues, errors: string[]) {
  if (!isRecord(input)) return
  if (typeof input.appName === 'string') {
    const value = input.appName.trim()
    if (value.length < 2 || value.length > 48) errors.push('metadata.appName must be 2-48 characters.')
    else next.metadata.appName = value
  }
  if (typeof input.appDescription === 'string') {
    const value = input.appDescription.trim()
    if (value.length < 2 || value.length > 160) errors.push('metadata.appDescription must be 2-160 characters.')
    else next.metadata.appDescription = value
  }
}

function validateImport(input: unknown, next: SettingsValues, errors: string[]) {
  if (!isRecord(input)) return
  if (typeof input.autoSaveLibraryItems === 'boolean') next.import.autoSaveLibraryItems = input.autoSaveLibraryItems
  else if (input.autoSaveLibraryItems != null) errors.push('import.autoSaveLibraryItems must be a boolean.')

  if (typeof input.allowDuplicateFilenames === 'boolean') next.import.allowDuplicateFilenames = input.allowDuplicateFilenames
  else if (input.allowDuplicateFilenames != null) errors.push('import.allowDuplicateFilenames must be a boolean.')
}

function validateDisplay(input: unknown, next: SettingsValues, errors: string[]) {
  if (!isRecord(input)) return
  if (typeof input.defaultTheme === 'string') {
    if (input.defaultTheme === 'dark' || input.defaultTheme === 'light' || input.defaultTheme === 'system') {
      next.display.defaultTheme = input.defaultTheme
    } else {
      errors.push('display.defaultTheme must be dark, light, or system.')
    }
  }
  if (typeof input.showStatsBar === 'boolean') next.display.showStatsBar = input.showStatsBar
  else if (input.showStatsBar != null) errors.push('display.showStatsBar must be a boolean.')
}

function validateLibrary(input: unknown, next: SettingsValues, errors: string[]) {
  if (!isRecord(input)) return
  if (typeof input.showArchivedItems === 'boolean') next.library.showArchivedItems = input.showArchivedItems
  else if (input.showArchivedItems != null) errors.push('library.showArchivedItems must be a boolean.')

  if (typeof input.enableSoftDelete === 'boolean') next.library.enableSoftDelete = input.enableSoftDelete
  else if (input.enableSoftDelete != null) errors.push('library.enableSoftDelete must be a boolean.')
}

function validateSafety(input: unknown, next: SettingsValues, errors: string[]) {
  if (!isRecord(input)) return
  if (typeof input.confirmDestructiveActions === 'boolean') next.safety.confirmDestructiveActions = input.confirmDestructiveActions
  else if (input.confirmDestructiveActions != null) errors.push('safety.confirmDestructiveActions must be a boolean.')

  if (typeof input.redactSensitiveMetadata === 'boolean') next.safety.redactSensitiveMetadata = input.redactSensitiveMetadata
  else if (input.redactSensitiveMetadata != null) errors.push('safety.redactSensitiveMetadata must be a boolean.')
}

function normalizeString(input: string | null | undefined, fallback: string): string {
  return input == null || input.trim().length === 0 ? fallback : input.trim()
}

function normalizeBoolean(input: boolean | null | undefined, fallback: boolean): boolean {
  return typeof input === 'boolean' ? input : fallback
}

function normalizeTheme(input: string | null | undefined): 'dark' | 'light' | 'system' {
  return input === 'dark' || input === 'light' || input === 'system'
    ? input
    : DEFAULT_SETTINGS.display.defaultTheme
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === 'object' && !Array.isArray(input)
}
