import { NextRequest, NextResponse } from 'next/server'
import busboy from 'busboy'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { randomBytes } from 'crypto'
import { createUploadTempPaths, pruneStaleUploadTempArtifacts } from '@/lib/upload-temp'

export const dynamic = 'force-dynamic'

class UploadError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
  }
}

/** Stream the multipart body to a temp file on disk.
 *  No size limit — busboy pipes directly to disk, nothing is buffered in memory. */
async function streamToDisk(
  request: NextRequest,
  tmpPath: string,
  contentType: string,
): Promise<{ rollName: string; fileName: string; bytesWritten: number }> {
  return new Promise((resolve, reject) => {
    let settled = false
    const done = (fn: () => void) => {
      if (!settled) { settled = true; fn() }
    }

    const bb = busboy({ headers: { 'content-type': contentType } })
    let rollName = ''
    let fileName = ''
    let bytesWritten = 0
    let fileWritePromise: Promise<void> | null = null

    bb.on('file', (field, stream, info) => {
      if (field !== 'file') { stream.resume(); return }
      const { filename } = info
      if (!filename?.toLowerCase().endsWith('.zip')) {
        stream.resume()
        done(() => reject(new UploadError('Please upload a .zip file')))
        return
      }
      fileName = filename
      const ws = createWriteStream(tmpPath)
      fileWritePromise = new Promise<void>((res, rej) => {
        ws.on('finish', res)
        ws.on('error', rej)
        stream.on('error', rej)
      })
      stream.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length
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
          done(() => reject(new UploadError('No file provided')))
          return
        }
        done(() => resolve({ rollName, fileName, bytesWritten }))
      } catch (err) {
        done(() => reject(err))
      }
    })

    bb.on('error', (err) => done(() => reject(err)))

    const reader = request.body!.getReader()
    ;(async () => {
      try {
        for (;;) {
          const { done: eof, value } = await reader.read()
          if (eof) { bb.end(); break }
          const buf = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
          const ok = bb.write(buf)
          if (!ok) await new Promise<void>(res => bb.once('drain', res))
        }
      } catch (err) {
        reader.cancel()
        bb.destroy(err instanceof Error ? err : new Error(String(err)))
      }
    })()
  })
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }
  if (!request.body) {
    return NextResponse.json({ error: 'No request body' }, { status: 400 })
  }

  try {
    const cleanup = await pruneStaleUploadTempArtifacts()
    if (cleanup.deleted.length > 0) {
      console.info(
        '[upload] pruned stale temp artifacts',
        JSON.stringify({ scanned: cleanup.scanned, deleted: cleanup.deleted.length, ttlMs: cleanup.ttlMs }),
      )
    }
  } catch (err) {
    console.warn('[upload] temp artifact pruning failed', err)
  }

  const jobId = randomBytes(16).toString('hex')
  const { tmpZip, metaFile } = createUploadTempPaths(jobId)

  try {
    const { rollName, fileName, bytesWritten } = await streamToDisk(request, tmpZip, contentType)

    // Write job metadata so the processing endpoint can find it
    await fs.writeFile(metaFile, JSON.stringify({ tmpZip, rollName, fileName }))

    console.info(
      '[upload] created temp upload artifacts',
      JSON.stringify({ jobId, tmpZip, metaFile, fileName, bytesWritten }),
    )

    return NextResponse.json({ jobId })
  } catch (err) {
    await fs.unlink(tmpZip).catch(() => {})
    await fs.unlink(metaFile).catch(() => {})
    const message = err instanceof Error ? err.message : 'Upload failed'
    const status = err instanceof UploadError ? err.status : 500
    console.error('[upload] failed to ingest upload', JSON.stringify({ jobId, status, message }))
    return NextResponse.json({ error: message }, { status })
  }
}
