import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { prisma } from '@/lib/db'
import { isImageFile, getUploadDir } from '@/lib/utils'
import { generateUniqueSlug } from '@/lib/server-utils'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const rollName = (formData.get('name') as string | null)?.trim()

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()

    // Filter to image files, skip hidden/system files
    const imageEntries = entries
      .filter(e => {
        const name = path.basename(e.entryName)
        return !name.startsWith('.') && !name.startsWith('__') && isImageFile(name)
      })
      .sort((a, b) => a.entryName.localeCompare(b.entryName))

    if (imageEntries.length === 0) {
      return NextResponse.json({ error: 'No image files found in zip' }, { status: 400 })
    }

    const name = rollName || file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ')
    const slug = await generateUniqueSlug(name)

    const roll = await prisma.roll.create({ data: { name, slug } })

    const uploadDir = getUploadDir()
    const rollDir = path.join(uploadDir, roll.id)
    const thumbDir = path.join(rollDir, 'thumbs')
    await fs.mkdir(rollDir, { recursive: true })
    await fs.mkdir(thumbDir, { recursive: true })

    const photoData: {
      rollId: string
      filename: string
      originalName: string
      path: string
      width: number | null
      height: number | null
      order: number
    }[] = []

    for (let i = 0; i < imageEntries.length; i++) {
      const entry = imageEntries[i]
      const originalName = path.basename(entry.entryName)
      const ext = path.extname(originalName).toLowerCase()
      const filename = `${String(i + 1).padStart(4, '0')}${ext}`
      const imgBuffer = entry.getData()

      await fs.writeFile(path.join(rollDir, filename), imgBuffer)

      let width: number | null = null
      let height: number | null = null

      try {
        const meta = await sharp(imgBuffer).metadata()
        width = meta.width ?? null
        height = meta.height ?? null

        await sharp(imgBuffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toFile(path.join(thumbDir, `${path.basename(filename, ext)}.jpg`))
      } catch {
        // If sharp can't process (e.g., TIFF variant), continue without thumb
      }

      photoData.push({
        rollId: roll.id,
        filename,
        originalName,
        path: `${roll.id}/${filename}`,
        width,
        height,
        order: i,
      })
    }

    await prisma.photo.createMany({ data: photoData })

    return NextResponse.json({ rollId: roll.id, photoCount: photoData.length }, { status: 201 })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
