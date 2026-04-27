import { NextRequest } from 'next/server'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import sharp from 'sharp'
import { prisma } from '@/lib/db'
import { isImageFile, getUploadDir } from '@/lib/utils'
import { generateUniqueSlug } from '@/lib/server-utils'
import { getSettings } from '@/lib/server-settings'

export const dynamic = 'force-dynamic'

type UploadMode = 'zip' | 'files'

type UploadMeta = {
  mode: UploadMode
  tmpZip: string | null
  imageFiles?: { tmpPath: string; originalName: string; bytesWritten?: number }[]
  rollName: string
  rollId?: string
  fileName: string
}

type SourceImage = {
  originalName: string
  readBuffer: () => Promise<Buffer>
}

async function persistPhotos(meta: UploadMeta, sourceImages: SourceImage[], send: (data: object) => void) {
  const total = sourceImages.length
  const requestedRollId = meta.rollId?.trim()
  const existingRoll = requestedRollId
    ? await prisma.roll.findUnique({ where: { id: requestedRollId } })
    : null

  if (requestedRollId && !existingRoll) {
    throw new Error('Target roll was not found. Refresh and try again.')
  }

  const roll = existingRoll ?? await (async () => {
    const name =
      meta.rollName ||
      meta.fileName.replace(/\.zip$/i, '').replace(/[-_]/g, ' ')
    const slug = await generateUniqueSlug(name)
    return prisma.roll.create({ data: { name, slug } })
  })()

  const [orderAggregate, lastNumberedFilename] = await Promise.all([
    prisma.photo.aggregate({
      where: { rollId: roll.id },
      _max: { order: true },
    }),
    prisma.photo.findFirst({
      where: { rollId: roll.id },
      orderBy: { filename: 'desc' },
      select: { filename: true },
    }),
  ])

  const nextOrderStart = (orderAggregate._max.order ?? -1) + 1
  const nextFilenameStart = (() => {
    const match = lastNumberedFilename?.filename.match(/^(\d+)\./)
    return match ? Number.parseInt(match[1], 10) + 1 : 1
  })()

  const settings = await getSettings()
  const uploadDir = getUploadDir()
  const rollDir = path.join(uploadDir, roll.id)
  const thumbDir = path.join(rollDir, 'thumbs')
  await fs.mkdir(rollDir, { recursive: true })
  await fs.mkdir(thumbDir, { recursive: true })

  const usedOriginalNames: string[] = []

  const photoData: {
    rollId: string
    filename: string
    originalName: string
    path: string
    width: number | null
    height: number | null
    order: number
  }[] = []

  for (let i = 0; i < total; i++) {
    const image = sourceImages[i]
    const sourceName = settings.import.allowDuplicateFilenames ? image.originalName : uniquifyName(image.originalName, usedOriginalNames)
    const ext = path.extname(sourceName).toLowerCase()
    const safeExt = ext || '.jpg'
    const filename = `${String(nextFilenameStart + i).padStart(4, '0')}${safeExt}`

    send({ stage: 'processing', current: i + 1, total, name: sourceName })

    const imgBuffer = await image.readBuffer()
    await fs.writeFile(path.join(rollDir, filename), imgBuffer)

    let width: number | null = null
    let height: number | null = null

    try {
      const rotated = sharp(imgBuffer).rotate()
      const imgMeta = await rotated.clone().metadata()
      width = imgMeta.width ?? null
      height = imgMeta.height ?? null

      await rotated
        .clone()
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(path.join(thumbDir, `${path.basename(filename, safeExt)}.jpg`))
    } catch {
      // Sharp can't process this format — continue without thumbnail
    }

    usedOriginalNames.push(sourceName)

    photoData.push({
      rollId: roll.id,
      filename,
      originalName: sourceName,
      path: `${roll.id}/${filename}`,
      width,
      height,
      order: nextOrderStart + i,
    })
  }

  await prisma.photo.createMany({ data: photoData })
  return { rollId: roll.id, count: photoData.length, appended: Boolean(existingRoll) }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params

  if (!/^[0-9a-f]{32}$/.test(jobId)) {
    return new Response('data: {"stage":"error","message":"Invalid job ID"}\n\n', {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const metaFile = path.join(tmpdir(), `grained-${jobId}.json`)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let tmpZip: string | null = null
      let tempImagePaths: string[] = []

      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client disconnected — ignore.
        }
      }

      try {
        let meta: UploadMeta
        try {
          const parsed = JSON.parse(await fs.readFile(metaFile, 'utf-8'))
          meta = {
            mode: parsed.mode === 'files' ? 'files' : 'zip',
            tmpZip: parsed.tmpZip ?? null,
            imageFiles: Array.isArray(parsed.imageFiles) ? parsed.imageFiles : [],
            rollName: parsed.rollName ?? '',
            rollId: parsed.rollId,
            fileName: parsed.fileName ?? '',
          }
        } catch {
          send({ stage: 'error', message: 'Upload session not found or expired. Please upload again.' })
          controller.close()
          return
        }

        tmpZip = meta.tmpZip
        tempImagePaths = (meta.imageFiles ?? []).map(file => file.tmpPath)
        await fs.unlink(metaFile).catch(() => {})

        let sourceImages: SourceImage[] = []

        if (meta.mode === 'zip') {
          if (!meta.tmpZip) {
            send({ stage: 'error', message: 'Upload session is missing zip data. Please upload again.' })
            controller.close()
            return
          }

          send({ stage: 'extracting', message: 'Opening zip file…' })

          let zip: AdmZip
          try {
            zip = new AdmZip(meta.tmpZip)
          } catch {
            send({ stage: 'error', message: 'Could not read zip — the file may be corrupt or not a valid zip.' })
            controller.close()
            return
          }

          const allEntries = zip.getEntries()
          const imageEntries = allEntries
            .filter((entry) => {
              const name = path.basename(entry.entryName)
              return !name.startsWith('.') && !name.startsWith('__') && isImageFile(name)
            })
            .sort((a, b) => a.entryName.localeCompare(b.entryName))

          if (imageEntries.length === 0) {
            send({
              stage: 'error',
              message:
                `No image files found in zip (${allEntries.length} total entr${allEntries.length === 1 ? 'y' : 'ies'}). ` +
                'Supported formats: JPG, TIFF, PNG, HEIC, WebP.',
            })
            controller.close()
            return
          }

          const total = imageEntries.length
          send({ stage: 'extracting', message: `Found ${total} image${total === 1 ? '' : 's'} — creating roll…` })

          sourceImages = imageEntries.map(entry => ({
            originalName: path.basename(entry.entryName),
            readBuffer: async () => entry.getData(),
          }))
        } else {
          const sortedFiles = (meta.imageFiles ?? [])
            .filter(file => isImageFile(file.originalName))
            .sort((a, b) => a.originalName.localeCompare(b.originalName) || a.tmpPath.localeCompare(b.tmpPath))

          if (sortedFiles.length === 0) {
            send({
              stage: 'error',
              message: 'No supported image files were uploaded. Supported formats: JPG, TIFF, PNG, HEIC, WebP.',
            })
            controller.close()
            return
          }

          const total = sortedFiles.length
          send({ stage: 'extracting', message: `Preparing ${total} uploaded image${total === 1 ? '' : 's'}…` })

          sourceImages = sortedFiles.map(file => ({
            originalName: file.originalName,
            readBuffer: async () => fs.readFile(file.tmpPath),
          }))
        }

        const { rollId, count } = await persistPhotos(meta, sourceImages, send)
        send({ stage: 'done', rollId, count })
        try { controller.close() } catch { }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Processing failed'
        send({ stage: 'error', message })
        try { controller.close() } catch { }
      } finally {
        if (tmpZip) {
          await fs.unlink(tmpZip).catch(() => {})
        }
        if (tempImagePaths.length > 0) {
          await Promise.all(tempImagePaths.map(filePath => fs.unlink(filePath).catch(() => {})))
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}


function uniquifyName(name: string, existing: string[]): string {
  const ext = path.extname(name)
  const base = path.basename(name, ext)
  const taken = new Set(existing.map((item) => item.toLowerCase()))
  let candidate = name
  let suffix = 1
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}${ext}`
    suffix += 1
  }
  return candidate
}
