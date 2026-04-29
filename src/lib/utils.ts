import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getUploadDir as getRuntimeUploadDir } from './runtime-paths'

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
    return `/api/images/${thumbPath(path)}`
  }
  return `/api/images/${path}`
}

export function thumbPath(path: string): string {
  const parts = path.split('/')
  const rollId = parts[0]
  const filename = parts.slice(1).join('/')
  const ext = filename.split('.').pop()
  const thumbName = ext
    ? filename.slice(0, Math.max(0, filename.length - ext.length - 1)) + '.jpg'
    : `${filename}.jpg`

  return `${rollId}/thumbs/${thumbName}`
}

export const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'heic', 'heif',
])

export function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.has(ext)
}

export function getUploadDir(): string {
  return getRuntimeUploadDir()
}
