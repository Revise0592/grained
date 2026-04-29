import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import { prisma } from '@/lib/db'
import { DEFAULT_APP_SETTINGS, mapDbAppSettings } from '@/lib/settings'
import {
  ensureUploadTempCapacity,
  getDirectorySize,
  MAX_LEGACY_CHUNKS,
  MAX_LEGACY_CHUNK_BYTES,
  MAX_UPLOAD_TEMP_BYTES_PER_JOB,
  pruneStaleUploadTempArtifacts,
} from '@/lib/upload-temp'
import {
  ImportSettingsValidationError,
  formatImportSettingsValidationError,
  parseImportSettings,
} from '@/lib/import-settings'

export const dynamic = 'force-dynamic'

async function getUploadTempTtlMs() {
  const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } })
  const hours = settings
    ? mapDbAppSettings(settings).dataSafety.keepUploadTempFilesHours
    : DEFAULT_APP_SETTINGS.dataSafety.keepUploadTempFilesHours

  return hours * 60 * 60 * 1000
}

export async function POST(request: NextRequest) {
  const jobId = request.headers.get('x-job-id') ?? ''
  const chunkIndex = parseInt(request.headers.get('x-chunk-index') ?? '', 10)
  const totalChunks = parseInt(request.headers.get('x-total-chunks') ?? '', 10)
  const fileName = request.headers.get('x-file-name') ?? ''
  const rollName = decodeURIComponent(request.headers.get('x-roll-name') ?? '')
  const frameNumberStart = request.headers.get('x-frame-number-start') ?? undefined
  const autoRotationPolicy = request.headers.get('x-auto-rotation-policy') ?? undefined
  const duplicateHandling = request.headers.get('x-duplicate-handling') ?? undefined

  if (!/^[0-9a-f]{32}$/.test(jobId)) {
    return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
  }
  if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
    return NextResponse.json({ error: 'Invalid x-chunk-index' }, { status: 400 })
  }
  if (!Number.isFinite(totalChunks) || totalChunks <= 0) {
    return NextResponse.json({ error: 'Invalid x-total-chunks' }, { status: 400 })
  }
  if (chunkIndex >= totalChunks) {
    return NextResponse.json({ error: 'x-chunk-index must be less than x-total-chunks' }, { status: 400 })
  }
  if (totalChunks > MAX_LEGACY_CHUNKS) {
    return NextResponse.json({ error: 'Upload uses too many chunks' }, { status: 413 })
  }
  if (!fileName.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'File must be a .zip' }, { status: 400 })
  }
  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LEGACY_CHUNK_BYTES) {
    return NextResponse.json({ error: 'Chunk exceeds the maximum allowed size' }, { status: 413 })
  }

  try {
    const settings = parseImportSettings({ frameNumberStart, autoRotationPolicy, duplicateHandling })
    const cleanup = await pruneStaleUploadTempArtifacts(Date.now(), await getUploadTempTtlMs())
    if (cleanup.deleted.length > 0) {
      console.info(
        '[upload/chunk] pruned stale temp artifacts',
        JSON.stringify({ scanned: cleanup.scanned, deleted: cleanup.deleted.length, ttlMs: cleanup.ttlMs }),
      )
    }

    await ensureUploadTempCapacity(MAX_LEGACY_CHUNK_BYTES)

    const chunkDir = path.join(tmpdir(), `grained-chunks-${jobId}`)
    await fs.mkdir(chunkDir, { recursive: true })

    // Persist metadata once (on the first chunk)
    if (chunkIndex === 0) {
      await fs.writeFile(
        path.join(chunkDir, 'meta.json'),
        JSON.stringify({ fileName, rollName, totalChunks, settings }),
      )
    }

    // Read the raw binary body — 10 MB chunks are fine in memory
    const data = await request.arrayBuffer()
    if (data.byteLength === 0) {
      return NextResponse.json({ error: 'Empty chunk body' }, { status: 400 })
    }
    if (data.byteLength > MAX_LEGACY_CHUNK_BYTES) {
      return NextResponse.json({ error: 'Chunk exceeds the maximum allowed size' }, { status: 413 })
    }
    const currentJobBytes = await getDirectorySize(chunkDir).catch(() => 0)
    if (currentJobBytes + data.byteLength > MAX_UPLOAD_TEMP_BYTES_PER_JOB) {
      return NextResponse.json({ error: 'Upload exceeds the maximum allowed size' }, { status: 413 })
    }

    const chunkFile = path.join(chunkDir, `chunk-${String(chunkIndex).padStart(6, '0')}`)
    await fs.writeFile(chunkFile, Buffer.from(data))

    return NextResponse.json(
      { ok: true, chunkIndex, fallback: true },
      {
        headers: {
          'X-Upload-Path': '/api/upload',
          'X-Deprecated-Endpoint': 'true',
        },
      },
    )
  } catch (err) {
    if (err instanceof ImportSettingsValidationError) {
      return NextResponse.json(formatImportSettingsValidationError(err), { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Failed to save chunk'
    const status = /currently full/i.test(message) ? 503 : 500
    console.error(`[upload/chunk] error saving chunk ${chunkIndex} for job ${jobId}:`, err)
    return NextResponse.json({ error: message }, { status })
  }
}
