export interface MetadataDefaults {
  defaultLab: string
  defaultDevelopProcess: string
  defaultCamera: string
  defaultLens: string
}

export interface ImportDefaults {
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

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type AppSettingsPatch = DeepPartial<AppSettingsShape>

export const DEFAULT_APP_SETTINGS: AppSettingsShape = {
  metadataDefaults: {
    defaultLab: '',
    defaultDevelopProcess: 'C-41',
    defaultCamera: '',
    defaultLens: '',
  },
  importDefaults: {
    autoCreateRollFromZip: true,
    inferShotDatesFromExif: true,
    defaultTimeZone: 'UTC',
    preserveOriginalFilenames: true,
  },
  displayPreferences: {
    theme: 'system',
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

export function mergeAppSettings(base: AppSettingsShape, patch?: AppSettingsPatch): AppSettingsShape {
  if (!patch) return base

  return {
    metadataDefaults: { ...base.metadataDefaults, ...patch.metadataDefaults },
    importDefaults: { ...base.importDefaults, ...patch.importDefaults },
    displayPreferences: { ...base.displayPreferences, ...patch.displayPreferences },
    libraryBehavior: { ...base.libraryBehavior, ...patch.libraryBehavior },
    dataSafety: { ...base.dataSafety, ...patch.dataSafety },
  }
}

export function normalizeAppSettings(patch?: AppSettingsPatch): AppSettingsShape {
  return mergeAppSettings(DEFAULT_APP_SETTINGS, patch)
}
