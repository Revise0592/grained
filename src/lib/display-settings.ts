import { prisma } from '@/lib/db'

export const THEME_MODES = ['dark', 'light', 'system'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const CARD_DENSITIES = ['comfortable', 'compact'] as const
export type CardDensity = (typeof CARD_DENSITIES)[number]

export const DATE_DISPLAY_FORMATS = ['relative', 'locale-short', 'iso'] as const
export type DateDisplayFormat = (typeof DATE_DISPLAY_FORMATS)[number]

export type DisplaySettings = {
  themeMode: ThemeMode
  cardDensity: CardDensity
  dateDisplayFormat: DateDisplayFormat
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  themeMode: 'dark',
  cardDensity: 'comfortable',
  dateDisplayFormat: 'relative',
}

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && THEME_MODES.includes(value as ThemeMode)

const isCardDensity = (value: unknown): value is CardDensity =>
  typeof value === 'string' && CARD_DENSITIES.includes(value as CardDensity)

const isDateDisplayFormat = (value: unknown): value is DateDisplayFormat =>
  typeof value === 'string' && DATE_DISPLAY_FORMATS.includes(value as DateDisplayFormat)

export function normalizeDisplaySettings(value: unknown): DisplaySettings {
  const source = (value && typeof value === 'object') ? value as Record<string, unknown> : {}

  return {
    themeMode: isThemeMode(source.themeMode) ? source.themeMode : DEFAULT_DISPLAY_SETTINGS.themeMode,
    cardDensity: isCardDensity(source.cardDensity) ? source.cardDensity : DEFAULT_DISPLAY_SETTINGS.cardDensity,
    dateDisplayFormat: isDateDisplayFormat(source.dateDisplayFormat) ? source.dateDisplayFormat : DEFAULT_DISPLAY_SETTINGS.dateDisplayFormat,
  }
}

export async function getDisplaySettings(): Promise<DisplaySettings> {
  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        ...DEFAULT_DISPLAY_SETTINGS,
      },
      select: {
        themeMode: true,
        cardDensity: true,
        dateDisplayFormat: true,
      },
    })

    return normalizeDisplaySettings(settings)
  } catch {
    return DEFAULT_DISPLAY_SETTINGS
  }
}

export function formatDateForDisplay(date: Date | string | null | undefined, format: DateDisplayFormat): string {
  if (!date) return '—'
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return '—'

  if (format === 'iso') {
    return parsed.toISOString().slice(0, 10)
  }

  if (format === 'locale-short') {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed)
  }

  const now = new Date()
  const deltaMs = parsed.getTime() - now.getTime()
  const deltaDays = Math.round(deltaMs / 86400000)

  if (Math.abs(deltaDays) <= 1) {
    if (deltaDays === 0) return 'today'
    if (deltaDays === -1) return 'yesterday'
    return 'tomorrow'
  }

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (Math.abs(deltaDays) < 30) return rtf.format(deltaDays, 'day')

  const deltaMonths = Math.round(deltaDays / 30)
  if (Math.abs(deltaMonths) < 12) return rtf.format(deltaMonths, 'month')

  const deltaYears = Math.round(deltaMonths / 12)
  return rtf.format(deltaYears, 'year')
}
