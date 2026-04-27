import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import { isLegacyChunkUploadEnabled, pruneStaleUploadTempArtifacts } from '@/lib/upload-temp'

export const dynamic = 'force-dynamic'

/**
 * Deprecated fallback endpoint.
 *
 * Primary ingestion now happens through POST /api/upload as multipart streaming.
 * Keep this route only for legacy clients while ENABLE_LEGACY_CHUNK_UPLOAD is enabled.
 */
export async function POST(request: NextRequest) {
  if (!isLegacyChunkUploadEnabled()) {
    return NextResponse.json(
      { error: 'Legacy chunk upload is disabled. Use POST /api/upload instead.' },
      {
        status: 410,
        headers: {
          'X-Upload-Path': '/api/upload',
          'X-Deprecated-Endpoint': 'true',
        },
      },
    )
  }

  const jobId = request.headers.get('x-job-id') ?? ''
  const chunkIndex = parseInt(request.headers.get('x-chunk-index') ?? '', 10)
  const totalChunks = parseInt(request.headers.get('x-total-chunks') ?? '', 10)
  const fileName = request.headers.get('x-file-name') ?? ''
  const rollName = decodeURIComponent(request.headers.get('x-roll-name') ?? '')

  if (!/^[0-9a-f]{32}$/.test(jobId)) {
    return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
  }
  if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
    return NextResponse.json({ error: 'Invalid x-chunk-index' }, { status: 400 })
  }
  if (!Number.isFinite(totalChunks) || totalChunks <= 0) {
    return NextResponse.json({ error: 'Invalid x-total-chunks' }, { status: 400 })
  }
  if (!fileName.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'File must be a .zip' }, { status: 400 })
  }

  try {
    const cleanup = await pruneStaleUploadTempArtifacts()
    if (cleanup.deleted.length > 0) {
      console.info(
        '[upload/chunk] pruned stale temp artifacts',
        JSON.stringify({ scanned: cleanup.scanned, deleted: cleanup.deleted.length, ttlMs: cleanup.ttlMs }),
      )
    }

    const chunkDir = path.join(tmpdir(), `grained-chunks-${jobId}`)
    await fs.mkdir(chunkDir, { recursive: true })

    // Persist metadata once (on the first chunk)
    if (chunkIndex === 0) {
      await fs.writeFile(
        path.join(chunkDir, 'meta.json'),
        JSON.stringify({ fileName, rollName, totalChunks }),
      )
    }

    // Read the raw binary body — 10 MB chunks are fine in memory
    const data = await request.arrayBuffer()
    if (data.byteLength === 0) {
      return NextResponse.json({ error: 'Empty chunk body' }, { status: 400 })
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
    const message = err instanceof Error ? err.message : 'Failed to save chunk'
    console.error(`[upload/chunk] error saving chunk ${chunkIndex} for job ${jobId}:`, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
