export type FilmType = 'color-negative' | 'black-and-white' | 'slide' | 'instant'

export interface FilmStock {
  name: string
  brand: string
  iso: number
  type: FilmType
}

export const FILM_STOCKS: FilmStock[] = [
  // Kodak Color Negative
  { name: 'Kodak Gold 200', brand: 'Kodak', iso: 200, type: 'color-negative' },
  { name: 'Kodak Gold 400', brand: 'Kodak', iso: 400, type: 'color-negative' },
  { name: 'Kodak Ultramax 400', brand: 'Kodak', iso: 400, type: 'color-negative' },
  { name: 'Kodak Portra 160', brand: 'Kodak', iso: 160, type: 'color-negative' },
  { name: 'Kodak Portra 400', brand: 'Kodak', iso: 400, type: 'color-negative' },
  { name: 'Kodak Portra 800', brand: 'Kodak', iso: 800, type: 'color-negative' },
  { name: 'Kodak Ektar 100', brand: 'Kodak', iso: 100, type: 'color-negative' },
  { name: 'Kodak ColorPlus 200', brand: 'Kodak', iso: 200, type: 'color-negative' },
  // Fujifilm Color Negative
  { name: 'Fujifilm Superia 400', brand: 'Fujifilm', iso: 400, type: 'color-negative' },
  { name: 'Fujifilm Superia X-TRA 400', brand: 'Fujifilm', iso: 400, type: 'color-negative' },
  { name: 'Fujifilm Pro 400H', brand: 'Fujifilm', iso: 400, type: 'color-negative' },
  { name: 'Fujifilm Fujicolor C200', brand: 'Fujifilm', iso: 200, type: 'color-negative' },
  { name: 'Fujifilm 200', brand: 'Fujifilm', iso: 200, type: 'color-negative' },
  // Lomography Color Negative
  { name: 'Lomography Color Negative 100', brand: 'Lomography', iso: 100, type: 'color-negative' },
  { name: 'Lomography Color Negative 400', brand: 'Lomography', iso: 400, type: 'color-negative' },
  { name: 'Lomography Color Negative 800', brand: 'Lomography', iso: 800, type: 'color-negative' },
  { name: 'Lomography Lady Grey 400', brand: 'Lomography', iso: 400, type: 'black-and-white' },
  // Ilford B&W
  { name: 'Ilford HP5 Plus 400', brand: 'Ilford', iso: 400, type: 'black-and-white' },
  { name: 'Ilford FP4 Plus 125', brand: 'Ilford', iso: 125, type: 'black-and-white' },
  { name: 'Ilford Delta 100', brand: 'Ilford', iso: 100, type: 'black-and-white' },
  { name: 'Ilford Delta 400', brand: 'Ilford', iso: 400, type: 'black-and-white' },
  { name: 'Ilford Delta 3200', brand: 'Ilford', iso: 3200, type: 'black-and-white' },
  { name: 'Ilford XP2 Super 400', brand: 'Ilford', iso: 400, type: 'black-and-white' },
  { name: 'Ilford Pan F Plus 50', brand: 'Ilford', iso: 50, type: 'black-and-white' },
  { name: 'Ilford Ortho Plus 80', brand: 'Ilford', iso: 80, type: 'black-and-white' },
  // Kodak B&W
  { name: 'Kodak Tri-X 400', brand: 'Kodak', iso: 400, type: 'black-and-white' },
  { name: 'Kodak T-Max 100', brand: 'Kodak', iso: 100, type: 'black-and-white' },
  { name: 'Kodak T-Max 400', brand: 'Kodak', iso: 400, type: 'black-and-white' },
  { name: 'Kodak T-Max P3200', brand: 'Kodak', iso: 3200, type: 'black-and-white' },
  { name: 'Kodak Double-X 5222', brand: 'Kodak', iso: 250, type: 'black-and-white' },
  // Fomapan B&W
  { name: 'Fomapan 100', brand: 'Foma', iso: 100, type: 'black-and-white' },
  { name: 'Fomapan 200', brand: 'Foma', iso: 200, type: 'black-and-white' },
  { name: 'Fomapan 400', brand: 'Foma', iso: 400, type: 'black-and-white' },
  // Rollei B&W
  { name: 'Rollei Superpan 200', brand: 'Rollei', iso: 200, type: 'black-and-white' },
  { name: 'Rollei RPX 25', brand: 'Rollei', iso: 25, type: 'black-and-white' },
  { name: 'Rollei RPX 400', brand: 'Rollei', iso: 400, type: 'black-and-white' },
  // Slide / E-6
  { name: 'Fujifilm Velvia 50', brand: 'Fujifilm', iso: 50, type: 'slide' },
  { name: 'Fujifilm Velvia 100', brand: 'Fujifilm', iso: 100, type: 'slide' },
  { name: 'Fujifilm Provia 100F', brand: 'Fujifilm', iso: 100, type: 'slide' },
  { name: 'Kodak Ektachrome E100', brand: 'Kodak', iso: 100, type: 'slide' },
  // Instant
  { name: 'Polaroid 600', brand: 'Polaroid', iso: 640, type: 'instant' },
  { name: 'Polaroid i-Type', brand: 'Polaroid', iso: 640, type: 'instant' },
  { name: 'Fujifilm Instax Wide', brand: 'Fujifilm', iso: 800, type: 'instant' },
  { name: 'Fujifilm Instax Mini', brand: 'Fujifilm', iso: 800, type: 'instant' },
]

export const FILM_FORMATS = ['35mm', '120', '4x5', '8x10', 'Instant'] as const
export const DEVELOP_PROCESSES = ['C-41', 'E-6', 'B&W', 'Cross-process', 'ECN-2', 'Other'] as const
export const PUSH_PULL_VALUES = ['-3', '-2', '-1', '0', '+1', '+2', '+3'] as const

export function filmTypeLabel(type: FilmType): string {
  const labels: Record<FilmType, string> = {
    'color-negative': 'Color Negative',
    'black-and-white': 'B&W',
    'slide': 'Slide / E-6',
    'instant': 'Instant',
  }
  return labels[type]
}

export function filmTypeColor(type: FilmType): string {
  const colors: Record<FilmType, string> = {
    'color-negative': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'black-and-white': 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
    'slide': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'instant': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  }
  return colors[type]
}
