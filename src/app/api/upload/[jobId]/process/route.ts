import { NextRequest } from 'next/server'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import sharp from 'sharp'
import { prisma } from '@/lib/db'
import { isImageFile, getUploadDir } from '@/lib/utils'
import { generateUniqueSlug } from '@/lib/server-utils'
import {
  AutoRotationPolicy,
  DuplicateHandlingPolicy,
  ImportSettings,
  ImportSettingsValidationError,
  mergeImportSettings,
  parseImportSettings,
} from '@/lib/import-settings'

export const dynamic = 'force-dynamic'

type UploadMode = 'zip' | 'files'

type UploadMeta = {
  mode: UploadMode
  tmpZip: string | null
  imageFiles?: { tmpPath: string; originalName: string; bytesWritten?: number }[]
  rollName: string
  rollId?: string
  settings?: ImportSettings
  fileName: string
}

type SourceImage = {
  originalName: string
  readBuffer: () => Promise<Buffer>
}

type EffectiveImportSettings = {
  frameNumberStart?: number
  autoRotationPolicy: AutoRotationPolicy
  duplicateHandling: DuplicateHandlingPolicy
}

function makeUniqueOriginalName(name: string, used: Set<string>) {
  const ext = path.extname(name)
  const base = path.basename(name, ext)
  let candidate = name
  let counter = 1
  while (used.has(candidate)) {
    counter += 1
    candidate = `${base} (${counter})${ext}`
  }
  return candidate
}

async function persistPhotos(
  meta: UploadMeta,
  sourceImages: SourceImage[],
  settings: EffectiveImportSettings,
  send: (data: object) => void,
) {
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

  const [orderAggregate, lastNumberedFilename, frameAggregate, existingByOriginalName] = await Promise.all([
    prisma.photo.aggregate({
      where: { rollId: roll.id },
      _max: { order: true },
    }),
    prisma.photo.findFirst({
      where: { rollId: roll.id },
      orderBy: { filename: 'desc' },
      select: { filename: true },
    }),
    prisma.photo.aggregate({
      where: { rollId: roll.id },
      _max: { frameNumber: true },
    }),
    prisma.photo.findMany({
      where: { rollId: roll.id },
      select: { id: true, originalName: true, filename: true, order: true },
    }),
  ])

  const nextOrderStart = (orderAggregate._max.order ?? -1) + 1
  const nextFilenameStart = (() => {
    const match = lastNumberedFilename?.filename.match(/^(\d+)\./)
    return match ? Number.parseInt(match[1], 10) + 1 : 1
  })()
  const frameStart = settings.frameNumberStart ?? ((frameAggregate._max.frameNumber ?? -1) + 1)
  const usedOriginalNames = new Set(existingByOriginalName.map(photo => photo.originalName))
  const existingByNameMap = new Map(existingByOriginalName.map(photo => [photo.originalName, photo]))

  const uploadDir = getUploadDir()
  const rollDir = path.join(uploadDir, roll.id)
  const thumbDir = path.join(rollDir, 'thumbs')
  await fs.mkdir(rollDir, { recursive: true })
  await fs.mkdir(thumbDir, { recursive: true })

  let createdCount = 0

  for (let i = 0; i < total; i++) {
    const image = sourceImages[i]
    const existing = existingByNameMap.get(image.originalName)
    if (existing && settings.duplicateHandling === 'skip') {
      send({ stage: 'processing', current: i + 1, total, name: image.originalName, skipped: true })
      continue
    }

    const originalName = existing && settings.duplicateHandling === 'rename'
      ? makeUniqueOriginalName(image.originalName, usedOriginalNames)
      : image.originalName
    usedOriginalNames.add(originalName)

    const ext = path.extname(image.originalName).toLowerCase()
    const safeExt = ext || '.jpg'
    const filename = `${String(nextFilenameStart + createdCount).padStart(4, '0')}${safeExt}`

    send({ stage: 'processing', current: i + 1, total, name: image.originalName })

    const imgBuffer = await image.readBuffer()
    const outputBuffer =
      settings.autoRotationPolicy === 'force-upright'
        ? await sharp(imgBuffer).rotate().toBuffer()
        : imgBuffer
    await fs.writeFile(path.join(rollDir, filename), outputBuffer)

    let width: number | null = null
    let height: number | null = null

    try {
      const pipeline = settings.autoRotationPolicy === 'off'
        ? sharp(outputBuffer)
        : sharp(outputBuffer).rotate()
      const imgMeta = await pipeline.clone().metadata()
      width = imgMeta.width ?? null
      height = imgMeta.height ?? null

      await pipeline
        .clone()
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(path.join(thumbDir, `${path.basename(filename, safeExt)}.jpg`))
    } catch {
      // Sharp can't process this format — continue without thumbnail
    }

    const dbData = {
      filename,
      originalName,
      path: `${roll.id}/${filename}`,
      width,
      height,
      order: existing && settings.duplicateHandling === 'replace' ? existing.order : nextOrderStart + createdCount,
      frameNumber: frameStart + createdCount,
    }

    if (existing && settings.duplicateHandling === 'replace') {
      await Promise.all([
        fs.unlink(path.join(rollDir, existing.filename)).catch(() => {}),
        fs.unlink(path.join(thumbDir, `${path.basename(existing.filename, path.extname(existing.filename))}.jpg`)).catch(() => {}),
      ])
      await prisma.photo.update({
        where: { id: existing.id },
        data: dbData,
      })
      existingByNameMap.delete(existing.originalName)
      existingByNameMap.set(originalName, { ...existing, ...dbData })
    } else {
      await prisma.photo.create({
        data: {
          rollId: roll.id,
          ...dbData,
        },
      })
    }
    createdCount += 1
  }
  return { rollId: roll.id, count: createdCount, appended: Boolean(existingRoll) }
}

export async function GET(
  request: NextRequest,
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
  let requestOverrides: ImportSettings
  try {
    requestOverrides = parseImportSettings({
      frameNumberStart: request.nextUrl.searchParams.get('frameNumberStart') ?? undefined,
      autoRotationPolicy: request.nextUrl.searchParams.get('autoRotationPolicy') ?? undefined,
      duplicateHandling: request.nextUrl.searchParams.get('duplicateHandling') ?? undefined,
    })
  } catch (err) {
    if (err instanceof ImportSettingsValidationError) {
      return new Response(
        `data: ${JSON.stringify({
          stage: 'error',
          message: err.message,
          field: err.field,
          value: err.value,
          allowedValues: err.allowed,
        })}\n\n`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/event-stream' },
        },
      )
    }
    throw err
  }

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
            settings: parsed.settings ?? {},
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

        const effectiveSettingsRaw = mergeImportSettings(
          meta.settings,
          requestOverrides,
        )
        const effectiveSettings: EffectiveImportSettings = {
          frameNumberStart: effectiveSettingsRaw.frameNumberStart,
          autoRotationPolicy: effectiveSettingsRaw.autoRotationPolicy ?? 'exif-only',
          duplicateHandling: effectiveSettingsRaw.duplicateHandling ?? 'rename',
        }

        const { rollId, count } = await persistPhotos(meta, sourceImages, effectiveSettings, send)
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
