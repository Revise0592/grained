import { NextRequest, NextResponse } from 'next/server'
import busboy from 'busboy'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { randomBytes } from 'crypto'
import path from 'path'
import { tmpdir } from 'os'
import { isImageFile } from '@/lib/utils'
import {
  createUploadTempImagePath,
  createUploadTempPaths,
  pruneStaleUploadTempArtifacts,
} from '@/lib/upload-temp'

export const dynamic = 'force-dynamic'

type UploadMode = 'zip' | 'files'

type UploadedTempImage = {
  originalName: string
  tmpPath: string
  bytesWritten: number
}

type StreamResult = {
  mode: UploadMode
  rollName: string
  fileName: string
  bytesWritten: number
  tmpZip: string | null
  imageFiles: UploadedTempImage[]
}

class UploadError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
  }
}

async function removeTempArtifacts(jobId: string, tmpZip: string, imageFiles: UploadedTempImage[] = []) {
  await fs.unlink(tmpZip).catch(() => {})
  await Promise.all(imageFiles.map(file => fs.unlink(file.tmpPath).catch(() => {})))

  const names = await fs.readdir(tmpdir()).catch(() => [])
  const tempImageNames = names.filter((name) => name.startsWith(`grained-${jobId}-img-`))
  await Promise.all(tempImageNames.map((name) => fs.unlink(path.join(tmpdir(), name)).catch(() => {})))
}

/** Stream multipart body to temp files on disk.
 *  No size limit — busboy pipes directly to disk, nothing is buffered in memory. */
async function streamToDisk(
  request: NextRequest,
  jobId: string,
  tmpZip: string,
  contentType: string,
): Promise<StreamResult> {
  return new Promise((resolve, reject) => {
    let settled = false
    const done = (fn: () => void) => {
      if (!settled) {
        settled = true
        fn()
      }
    }

    const bb = busboy({ headers: { 'content-type': contentType } })
    let rollName = ''
    let zipName = ''
    let zipBytes = 0
    let zipCount = 0
    let imageCount = 0
    let imageIndex = 0
    const imageFiles: UploadedTempImage[] = []
    const writes: Promise<void>[] = []

    bb.on('file', (_field, stream, info) => {
      const { filename } = info
      if (!filename) {
        stream.resume()
        return
      }

      const lower = filename.toLowerCase()
      if (lower.endsWith('.zip')) {
        if (zipCount > 0 || imageCount > 0) {
          stream.resume()
          done(() => reject(new UploadError('Upload either one .zip or multiple image files, not both.')))
          return
        }

        zipCount += 1
        zipName = filename
        const ws = createWriteStream(tmpZip)
        const writePromise = new Promise<void>((res, rej) => {
          ws.on('finish', res)
          ws.on('error', rej)
          stream.on('error', rej)
        })
        stream.on('data', (chunk: Buffer) => {
          zipBytes += chunk.length
        })
        stream.pipe(ws)
        writes.push(writePromise)
        return
      }

      if (!isImageFile(filename)) {
        stream.resume()
        done(() => reject(new UploadError('Please upload either a .zip file or supported image files.')))
        return
      }

      if (zipCount > 0) {
        stream.resume()
        done(() => reject(new UploadError('Upload either one .zip or multiple image files, not both.')))
        return
      }

      imageCount += 1
      imageIndex += 1
      const tmpPath = createUploadTempImagePath(jobId, imageIndex, filename)
      const ws = createWriteStream(tmpPath)
      let bytesWritten = 0
      const writePromise = new Promise<void>((res, rej) => {
        ws.on('finish', res)
        ws.on('error', rej)
        stream.on('error', rej)
      })
      stream.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length
      })
      stream.pipe(ws)
      writes.push(writePromise)
      imageFiles.push({ originalName: filename, tmpPath, bytesWritten })
      writePromise.then(() => {
        const target = imageFiles.find(file => file.tmpPath === tmpPath)
        if (target) {
          target.bytesWritten = bytesWritten
        }
      }).catch(() => {})
    })

    bb.on('field', (name, val) => {
      if (name === 'name') rollName = val.trim()
    })

    bb.on('finish', async () => {
      try {
        await Promise.all(writes)

        if (zipCount === 1) {
          done(() => resolve({
            mode: 'zip',
            rollName,
            fileName: zipName,
            bytesWritten: zipBytes,
            tmpZip,
            imageFiles: [],
          }))
          return
        }

        if (imageCount > 0) {
          done(() => resolve({
            mode: 'files',
            rollName,
            fileName: imageCount === 1 ? imageFiles[0].originalName : `${imageCount} files`,
            bytesWritten: imageFiles.reduce((sum, file) => sum + file.bytesWritten, 0),
            tmpZip: null,
            imageFiles,
          }))
          return
        }

        done(() => reject(new UploadError('No files provided')))
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
          if (eof) {
            bb.end()
            break
          }
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
    const result = await streamToDisk(request, jobId, tmpZip, contentType)

    await fs.writeFile(metaFile, JSON.stringify({
      mode: result.mode,
      tmpZip: result.tmpZip,
      imageFiles: result.imageFiles,
      rollName: result.rollName,
      fileName: result.fileName,
    }))

    console.info(
      '[upload] created temp upload artifacts',
      JSON.stringify({
        jobId,
        mode: result.mode,
        tmpZip: result.tmpZip,
        imageFiles: result.imageFiles.map(file => ({ tmpPath: file.tmpPath, originalName: file.originalName, bytesWritten: file.bytesWritten })),
        metaFile,
        fileName: result.fileName,
        bytesWritten: result.bytesWritten,
      }),
    )

    return NextResponse.json({ jobId })
  } catch (err) {
    await removeTempArtifacts(jobId, tmpZip)
    await fs.unlink(metaFile).catch(() => {})
    const message = err instanceof Error ? err.message : 'Upload failed'
    const status = err instanceof UploadError ? err.status : 500
    console.error('[upload] failed to ingest upload', JSON.stringify({ jobId, status, message }))
    return NextResponse.json({ error: message }, { status })
  }
}
