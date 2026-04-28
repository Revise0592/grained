import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { Readable } from 'stream'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import sharp from 'sharp'
import yauzl from 'yauzl'
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
import {
  applyMetadataDefaultsToRoll,
  type AppSettingsShape,
  DEFAULT_APP_SETTINGS,
  mapDbAppSettings,
} from '@/lib/settings'

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
  inputPath: string
}

type EffectiveImportSettings = {
  frameNumberStart?: number
  autoRotationPolicy: AutoRotationPolicy
  duplicateHandling: DuplicateHandlingPolicy
}

const MAX_PARALLEL_IMAGE_WORK = 3
const MAX_INPUT_PIXELS = 100_000_000
const MAX_ZIP_ENTRY_BYTES = 100 * 1024 * 1024
const MAX_ZIP_TOTAL_BYTES = 750 * 1024 * 1024

function openZipFile(filePath: string) {
  return new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipFile) => {
      if (err || !zipFile) return reject(err ?? new Error('Unable to open zip file'))
      resolve(zipFile)
    })
  })
}

function readZipEntryStream(zipFile: yauzl.ZipFile, entry: yauzl.Entry) {
  return new Promise<Readable>((resolve, reject) => {
    zipFile.openReadStream(entry, (err, stream) => {
      if (err || !stream) return reject(err ?? new Error('Unable to read zip entry'))
      resolve(stream as Readable)
    })
  })
}

function normalizeAndValidateZipEntryName(entryName: string) {
  const normalized = entryName.replace(/\\/g, '/')
  if (!normalized || normalized.includes('\0') || normalized.startsWith('/')) return null
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length === 0 || segments.includes('..')) return null
  return {
    entryName: segments.join('/'),
    basename: segments[segments.length - 1],
  }
}

async function writeZipEntryToTempFile(
  zipFile: yauzl.ZipFile,
  entry: yauzl.Entry,
  maxBytes: number,
) {
  const stream = await readZipEntryStream(zipFile, entry)
  const tmpPath = path.join(tmpdir(), `grained-zip-entry-${randomBytes(12).toString('hex')}`)
  const out = createWriteStream(tmpPath, { flags: 'wx' })

  let written = 0
  try {
    await new Promise<void>((resolve, reject) => {
      const rejectOnce = (error: Error) => {
        stream.destroy(error)
        out.destroy(error)
        reject(error)
      }
      stream.on('data', (chunk: Buffer) => {
        written += chunk.length
        if (written > maxBytes) {
          rejectOnce(new Error(`Zip entry exceeds limit of ${maxBytes} bytes`))
        }
      })
      stream.on('error', reject)
      out.on('error', reject)
      out.on('finish', resolve)
      stream.pipe(out)
    })
  } catch (error) {
    await fs.unlink(tmpPath).catch(() => {})
    throw error
  }

  return { tmpPath, bytesWritten: written }
}

async function collectZipImageFiles(
  tmpZip: string,
  send: (data: object) => void,
) {
  let zipFile: yauzl.ZipFile | null = null
  const tempPaths: string[] = []
  let totalExtractedBytes = 0

  try {
    zipFile = await openZipFile(tmpZip)
    const imageEntries: Array<{ entry: yauzl.Entry; originalName: string; entryName: string }> = []
    let totalEntries = 0

    await new Promise<void>((resolve, reject) => {
      zipFile!.on('error', reject)
      zipFile!.on('entry', (entry) => {
        totalEntries += 1
        const isDirectory = /\/$/.test(entry.fileName)
        if (!isDirectory) {
          const safeName = normalizeAndValidateZipEntryName(entry.fileName)
          if (!safeName) {
            reject(new Error(`Zip contains invalid or unsafe entry path: "${entry.fileName}"`))
            return
          }
          if (safeName.basename.startsWith('.') || safeName.basename.startsWith('__')) {
            zipFile!.readEntry()
            return
          }
          if (isImageFile(safeName.basename)) {
            if (entry.uncompressedSize > MAX_ZIP_ENTRY_BYTES) {
              reject(new Error(`Zip entry "${safeName.basename}" exceeds per-file extraction limit`))
              return
            }
            imageEntries.push({
              entry,
              originalName: safeName.basename,
              entryName: safeName.entryName,
            })
          }
        }
        zipFile!.readEntry()
      })
      zipFile!.on('end', resolve)
      zipFile!.readEntry()
    })

    imageEntries.sort((a, b) => a.entryName.localeCompare(b.entryName))
    if (imageEntries.length === 0) {
      return { sourceImages: [] as SourceImage[], tempPaths, totalEntries }
    }

    send({
      stage: 'extracting',
      message: `Found ${imageEntries.length} image${imageEntries.length === 1 ? '' : 's'} — creating roll…`,
    })

    const sourceImages: SourceImage[] = []
    for (let i = 0; i < imageEntries.length; i++) {
      const item = imageEntries[i]
      const { tmpPath, bytesWritten } = await writeZipEntryToTempFile(zipFile, item.entry, MAX_ZIP_ENTRY_BYTES)
      totalExtractedBytes += bytesWritten
      if (totalExtractedBytes > MAX_ZIP_TOTAL_BYTES) {
        throw new Error('Zip exceeds total extraction limit')
      }
      tempPaths.push(tmpPath)
      sourceImages.push({
        originalName: item.originalName,
        inputPath: tmpPath,
      })
      send({
        stage: 'extracting',
        message: `Extracting images… (${i + 1}/${imageEntries.length})`,
      })
    }

    return { sourceImages, tempPaths, totalEntries }
  } finally {
    zipFile?.close()
  }
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

async function runWithConcurrencyLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  const safeLimit = Math.max(1, limit)
  let index = 0

  async function consume() {
    while (true) {
      const nextIndex = index
      index += 1
      if (nextIndex >= items.length) return
      await worker(items[nextIndex])
    }
  }

  await Promise.all(Array.from({ length: Math.min(safeLimit, items.length) }, () => consume()))
}

async function persistPhotos(
  meta: UploadMeta,
  sourceImages: SourceImage[],
  settings: EffectiveImportSettings,
  appSettings: AppSettingsShape,
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
    const metadataApplied = applyMetadataDefaultsToRoll({}, appSettings)
    const created = await prisma.roll.create({
      data: {
        name,
        slug,
        lab: metadataApplied.lab,
        developProcess: metadataApplied.developProcess,
        filmFormat: metadataApplied.filmFormat,
        camera: metadataApplied.camera,
        lens: metadataApplied.lens,
        ...(metadataApplied.tags?.length && {
          tags: {
            connectOrCreate: metadataApplied.tags.map((tagName: string) => ({
              where: { name: tagName },
              create: { name: tagName },
            })),
          },
        }),
      },
    })

    if (appSettings.libraryBehavior.saveCamerasAutomatically && created.camera) {
      await prisma.savedCamera.upsert({
        where: { name: created.camera },
        update: {},
        create: { name: created.camera },
      })
    }

    return created
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
  const plannedImages: Array<{
    sourceIndex: number
    createdIndex: number
    image: SourceImage
    existing: { id: string; originalName: string; filename: string; order: number } | undefined
    originalName: string
    filename: string
    safeExt: string
  }> = []

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
    plannedImages.push({
      sourceIndex: i,
      createdIndex: createdCount,
      image,
      existing,
      originalName,
      filename,
      safeExt,
    })
    createdCount += 1
  }

  await runWithConcurrencyLimit(plannedImages, MAX_PARALLEL_IMAGE_WORK, async (plan) => {
    const { sourceIndex, createdIndex, image, existing, originalName, filename, safeExt } = plan
    const phaseStart = Date.now()
    send({ stage: 'processing', current: sourceIndex + 1, total, name: image.originalName })

    const decodeStart = Date.now()
    const inputPipeline = sharp(image.inputPath, { limitInputPixels: MAX_INPUT_PIXELS })
    const shouldRotate = settings.autoRotationPolicy !== 'off'
    const outputPipeline = settings.autoRotationPolicy === 'force-upright' ? inputPipeline.rotate() : inputPipeline
    let outputInfo: sharp.OutputInfo | null = null
    try {
      outputInfo = await outputPipeline.toFile(path.join(rollDir, filename))
    } catch {
      await fs.copyFile(image.inputPath, path.join(rollDir, filename))
    }
    const decodeMs = Date.now() - decodeStart
    console.info(
      `[persistPhotos] decode/write ${sourceIndex + 1}/${total} "${image.originalName}" ${decodeMs}ms`,
    )

    let width: number | null = null
    let height: number | null = null

    try {
      if (outputInfo?.width && outputInfo?.height) {
        width = outputInfo.width
        height = outputInfo.height
      } else {
        const metaPipeline = sharp(image.inputPath, { limitInputPixels: MAX_INPUT_PIXELS })
        const meta = await (shouldRotate ? metaPipeline.rotate() : metaPipeline).metadata()
        width = meta.width ?? null
        height = meta.height ?? null
      }

      const thumbStart = Date.now()
      const thumbPipeline = sharp(image.inputPath, { limitInputPixels: MAX_INPUT_PIXELS })
      await (shouldRotate ? thumbPipeline.rotate() : thumbPipeline)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(path.join(thumbDir, `${path.basename(filename, safeExt)}.jpg`))
      const thumbMs = Date.now() - thumbStart
      console.info(
        `[persistPhotos] thumbnail ${sourceIndex + 1}/${total} "${image.originalName}" ${thumbMs}ms`,
      )
    } catch {
      // Sharp can't process this format — continue without thumbnail
    }

    const dbData = {
      filename,
      originalName,
      path: `${roll.id}/${filename}`,
      width,
      height,
      order: existing && settings.duplicateHandling === 'replace' ? existing.order : nextOrderStart + createdIndex,
      frameNumber: frameStart + createdIndex,
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
    const totalMs = Date.now() - phaseStart
    console.info(
      `[persistPhotos] complete ${sourceIndex + 1}/${total} "${image.originalName}" ${totalMs}ms`,
    )
  })
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
          let zipImages
          try {
            zipImages = await collectZipImageFiles(meta.tmpZip, send)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not read zip — the file may be corrupt or not a valid zip.'
            send({ stage: 'error', message })
            controller.close()
            return
          }

          if (zipImages.sourceImages.length === 0) {
            send({
              stage: 'error',
              message:
                `No image files found in zip (${zipImages.totalEntries} total entr${zipImages.totalEntries === 1 ? 'y' : 'ies'}). ` +
                'Supported formats: JPG, TIFF, PNG, HEIC, WebP.',
            })
            controller.close()
            return
          }

          tempImagePaths = [...tempImagePaths, ...zipImages.tempPaths]
          sourceImages = zipImages.sourceImages
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
            inputPath: file.tmpPath,
          }))
        }

        const savedSettings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } })
        const appSettings: AppSettingsShape = savedSettings
          ? mapDbAppSettings(savedSettings)
          : DEFAULT_APP_SETTINGS
        const importDefaults = appSettings.importDefaults

        const effectiveSettingsRaw = mergeImportSettings(
          {
            frameNumberStart: importDefaults.frameNumberStart ?? undefined,
            autoRotationPolicy: importDefaults.autoRotationPolicy,
            duplicateHandling: importDefaults.duplicateHandling,
          },
          mergeImportSettings(meta.settings, requestOverrides),
        )
        const effectiveSettings: EffectiveImportSettings = {
          frameNumberStart: effectiveSettingsRaw.frameNumberStart,
          autoRotationPolicy: effectiveSettingsRaw.autoRotationPolicy ?? importDefaults.autoRotationPolicy,
          duplicateHandling: effectiveSettingsRaw.duplicateHandling ?? importDefaults.duplicateHandling,
        }

        const { rollId, count } = await persistPhotos(meta, sourceImages, effectiveSettings, appSettings, send)
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
