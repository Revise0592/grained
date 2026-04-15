import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import busboy from 'busboy'
import path from 'path'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { tmpdir } from 'os'
import { Readable } from 'stream'
import sharp from 'sharp'
import { prisma } from '@/lib/db'
import { isImageFile, getUploadDir } from '@/lib/utils'
import { generateUniqueSlug } from '@/lib/server-utils'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

class UploadError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
  }
}

interface ParsedUpload {
  tmpPath: string
  rollName: string
  fileName: string
}

/** Stream the multipart body to a temp file on disk via busboy.
 *  Avoids loading the entire zip into memory during the upload phase. */
function streamUploadToDisk(request: NextRequest): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      reject(new UploadError('Expected multipart/form-data'))
      return
    }

    if (!request.body) {
      reject(new UploadError('No request body'))
      return
    }

    const bb = busboy({ headers: { 'content-type': contentType } })
    const tmpPath = path.join(
      tmpdir(),
      `grained-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`
    )
    let rollName = ''
    let fileName = ''
    let fileWritePromise: Promise<void> | null = null

    bb.on('file', (field, stream, info) => {
      if (field !== 'file') {
        stream.resume()
        return
      }
      const { filename } = info
      if (!filename?.toLowerCase().endsWith('.zip')) {
        stream.resume()
        reject(new UploadError('Please upload a .zip file'))
        return
      }

      fileName = filename
      const ws = createWriteStream(tmpPath)
      fileWritePromise = new Promise<void>((res, rej) => {
        ws.on('finish', res)
        ws.on('error', rej)
        stream.on('error', rej)
      })
      stream.pipe(ws)
    })

    bb.on('field', (name, val) => {
      if (name === 'name') rollName = val.trim()
    })

    bb.on('finish', async () => {
      try {
        if (fileWritePromise) await fileWritePromise
        if (!fileName) {
          reject(new UploadError('No file provided'))
          return
        }
        resolve({ tmpPath, rollName, fileName })
      } catch (err) {
        reject(err)
      }
    })

    bb.on('error', reject)

    Readable.fromWeb(request.body as ReadableStream<Uint8Array>).pipe(bb)
  })
}

export async function POST(request: NextRequest) {
  let tmpPath: string | null = null

  try {
    const parsed = await streamUploadToDisk(request)
    tmpPath = parsed.tmpPath

    let zip: AdmZip
    try {
      zip = new AdmZip(tmpPath)
    } catch {
      throw new UploadError('Could not read zip file — the file may be corrupt or not a valid zip')
    }

    const entries = zip.getEntries()
    const imageEntries = entries
      .filter(e => {
        const name = path.basename(e.entryName)
        return !name.startsWith('.') && !name.startsWith('__') && isImageFile(name)
      })
      .sort((a, b) => a.entryName.localeCompare(b.entryName))

    if (imageEntries.length === 0) {
      throw new UploadError(
        `No image files found in zip (${entries.length} total entries). ` +
        `Supported formats: JPG, TIFF, PNG, HEIC.`
      )
    }

    const name =
      parsed.rollName ||
      parsed.fileName.replace(/\.zip$/i, '').replace(/[-_]/g, ' ')
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
        // .rotate() auto-rotates based on EXIF orientation and strips EXIF,
        // so thumbnails and the browser-rendered full image agree on orientation.
        const rotated = sharp(imgBuffer).rotate()
        const meta = await rotated.clone().metadata()
        width = meta.width ?? null
        height = meta.height ?? null

        await rotated
          .clone()
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

    return NextResponse.json(
      { rollId: roll.id, photoCount: photoData.length },
      { status: 201 }
    )
  } catch (err) {
    console.error('Upload error:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    const status = err instanceof UploadError ? err.status : 500
    return NextResponse.json({ error: message }, { status })
  } finally {
    if (tmpPath) {
      await fs.unlink(tmpPath).catch(() => {})
    }
  }
}
