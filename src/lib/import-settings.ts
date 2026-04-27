export const AUTO_ROTATION_POLICIES = ['off', 'exif-only', 'force-upright'] as const
export const DUPLICATE_HANDLING_POLICIES = ['skip', 'rename', 'replace'] as const

export type AutoRotationPolicy = (typeof AUTO_ROTATION_POLICIES)[number]
export type DuplicateHandlingPolicy = (typeof DUPLICATE_HANDLING_POLICIES)[number]

export type ImportSettings = {
  frameNumberStart?: number
  autoRotationPolicy?: AutoRotationPolicy
  duplicateHandling?: DuplicateHandlingPolicy
}

export class ImportSettingsValidationError extends Error {
  constructor(
    message: string,
    public readonly field: keyof ImportSettings,
    public readonly value: unknown,
    public readonly allowed?: readonly string[],
  ) {
    super(message)
  }
}

function parseFrameNumberStart(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const normalized = typeof value === 'string' ? value.trim() : value
  const parsed = typeof normalized === 'number' ? normalized : Number.parseInt(String(normalized), 10)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ImportSettingsValidationError(
      'Unsupported frame numbering start value. Provide a non-negative integer.',
      'frameNumberStart',
      value,
    )
  }
  return parsed
}

function parseEnum<T extends readonly string[]>(
  field: keyof ImportSettings,
  value: unknown,
  allowedValues: T,
): T[number] | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new ImportSettingsValidationError(
      `Unsupported ${field} value.`,
      field,
      value,
      allowedValues,
    )
  }

  if ((allowedValues as readonly string[]).includes(value)) {
    return value as T[number]
  }

  throw new ImportSettingsValidationError(
    `Unsupported ${field} value \"${value}\".`,
    field,
    value,
    allowedValues,
  )
}

export function parseImportSettings(raw: {
  frameNumberStart?: unknown
  autoRotationPolicy?: unknown
  duplicateHandling?: unknown
}): ImportSettings {
  return {
    frameNumberStart: parseFrameNumberStart(raw.frameNumberStart),
    autoRotationPolicy: parseEnum('autoRotationPolicy', raw.autoRotationPolicy, AUTO_ROTATION_POLICIES),
    duplicateHandling: parseEnum('duplicateHandling', raw.duplicateHandling, DUPLICATE_HANDLING_POLICIES),
  }
}

export function formatImportSettingsValidationError(err: ImportSettingsValidationError) {
  return {
    error: err.message,
    field: err.field,
    value: err.value,
    allowedValues: err.allowed,
  }
}

export function mergeImportSettings(
  base: ImportSettings | undefined,
  overrides: ImportSettings,
): ImportSettings {
  return {
    frameNumberStart: overrides.frameNumberStart ?? base?.frameNumberStart,
    autoRotationPolicy: overrides.autoRotationPolicy ?? base?.autoRotationPolicy,
    duplicateHandling: overrides.duplicateHandling ?? base?.duplicateHandling,
  }
}
