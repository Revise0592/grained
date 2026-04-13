import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function imageUrl(path: string, thumb = false): string {
  if (thumb) {
    const parts = path.split('/')
    return `/api/images/${parts[0]}/thumbs/${parts.slice(1).join('/')}`
  }
  return `/api/images/${path}`
}

export const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'heic', 'heif',
])

export function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.has(ext)
}

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? './data/uploads'
}
