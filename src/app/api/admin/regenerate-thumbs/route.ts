import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { prisma } from '@/lib/db'
import { getUploadDir } from '@/lib/utils'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST() {
  const uploadDir = getUploadDir()
  const photos = await prisma.photo.findMany({
    select: { id: true, path: true, filename: true, rollId: true },
  })

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const photo of photos) {
    const rollId = photo.rollId
    const ext = path.extname(photo.filename).toLowerCase()
    const basename = path.basename(photo.filename, ext)
    const originalPath = path.join(uploadDir, rollId, photo.filename)
    const thumbDir = path.join(uploadDir, rollId, 'thumbs')
    const thumbPath = path.join(thumbDir, `${basename}.jpg`)

    try {
      const imgBuffer = await fs.readFile(originalPath)

      const rotated = sharp(imgBuffer).rotate()
      const meta = await rotated.clone().metadata()
      const width = meta.width ?? null
      const height = meta.height ?? null

      await fs.mkdir(thumbDir, { recursive: true })
      await rotated.clone()
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(thumbPath)

      await prisma.photo.update({
        where: { id: photo.id },
        data: { width, height },
      })

      ok++
    } catch {
      // Original file missing or Sharp can't process it
      try {
        // If original is missing but thumb exists, count as skipped
        await fs.access(thumbPath)
        skipped++
      } catch {
        failed++
      }
    }
  }

  return NextResponse.json({ total: photos.length, ok, skipped, failed })
}
