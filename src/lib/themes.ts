export const THEME_PALETTES = [
  'classic',
  'paper',
  'sepia',
  'darkroom',
  'kodak-gold-200',
  'fuji-superia-x-tra-400',
  'portra-400',
  'lomo-400',
] as const

export type ThemePalette = (typeof THEME_PALETTES)[number]

export const DEFAULT_THEME_PALETTE: ThemePalette = 'classic'

export const THEME_PALETTE_OPTIONS: ReadonlyArray<{
  value: ThemePalette
  label: string
  description: string
}> = [
  {
    value: 'classic',
    label: 'Classic',
    description: 'Warm neutral tones based on the current Grained look.',
  },
  {
    value: 'paper',
    label: 'Paper',
    description: 'Clean archival paper tones with restrained contrast.',
  },
  {
    value: 'sepia',
    label: 'Sepia',
    description: 'Warm tan and brown tones with amber accents.',
  },
  {
    value: 'darkroom',
    label: 'Darkroom',
    description: 'Moodier contrast with red-amber darkroom accents.',
  },
  {
    value: 'kodak-gold-200',
    label: 'Kodak Gold 200',
    description: 'Sunny golden warmth with nostalgic amber highlights.',
  },
  {
    value: 'fuji-superia-x-tra-400',
    label: 'Fuji Superia X-Tra 400',
    description: 'Cooler greens and cyan tones with punchy contrast.',
  },
  {
    value: 'portra-400',
    label: 'Portra 400',
    description: 'Soft pastel neutrals with refined peach-and-sage accents.',
  },
  {
    value: 'lomo-400',
    label: 'Lomo 400',
    description: 'High-energy saturated reds, teals, and deeper shadows.',
  },
] as const
