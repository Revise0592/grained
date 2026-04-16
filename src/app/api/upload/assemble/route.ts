import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { tmpdir } from 'os'

export const dynamic = 'force-dynamic'

/**
 * POST /api/upload/assemble
 *
 * Called after all chunks have been uploaded via /api/upload/chunk.
 * Concatenates chunks in order to produce the final .zip, writes a metadata
 * file for the /api/upload/[jobId]/process SSE endpoint, then returns { jobId }.
 *
 * Body (JSON): { jobId, totalChunks, fileName, rollName }
 */
export async function POST(request: NextRequest) {
  let body: { jobId?: unknown; totalChunks?: unknown; fileName?: unknown; rollName?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const { jobId, totalChunks, fileName, rollName } = body

  if (typeof jobId !== 'string' || !/^[0-9a-f]{32}$/.test(jobId)) {
    return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
  }
  if (typeof totalChunks !== 'number' || !Number.isInteger(totalChunks) || totalChunks <= 0) {
    return NextResponse.json({ error: 'Invalid totalChunks' }, { status: 400 })
  }
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'fileName must end in .zip' }, { status: 400 })
  }

  const resolvedRollName = typeof rollName === 'string' ? rollName : ''
  const chunkDir = path.join(tmpdir(), `grained-chunks-${jobId}`)
  const assembledPath = path.join(tmpdir(), `grained-${jobId}.zip`)
  const metaFile = path.join(tmpdir(), `grained-${jobId}.json`)

  try {
    // Verify every expected chunk exists before starting assembly
    const chunkPaths = Array.from({ length: totalChunks }, (_, i) =>
      path.join(chunkDir, `chunk-${String(i).padStart(6, '0')}`),
    )
    for (const cp of chunkPaths) {
      try {
        await fs.access(cp)
      } catch {
        return NextResponse.json(
          { error: `Missing chunk ${path.basename(cp)} — upload may be incomplete` },
          { status: 400 },
        )
      }
    }

    // Stream chunks into the assembled file in order
    const ws = createWriteStream(assembledPath)
    for (const cp of chunkPaths) {
      const data = await fs.readFile(cp)
      await new Promise<void>((resolve, reject) => {
        ws.write(data, (err) => (err ? reject(err) : resolve()))
      })
    }
    await new Promise<void>((resolve, reject) => {
      ws.end((err?: Error | null) => (err ? reject(err) : resolve()))
    })

    // Write metadata for the processing SSE endpoint
    await fs.writeFile(
      metaFile,
      JSON.stringify({ tmpZip: assembledPath, rollName: resolvedRollName, fileName }),
    )

    // Remove chunk directory — assembled file is all we need now
    await fs.rm(chunkDir, { recursive: true, force: true }).catch(() => {})

    return NextResponse.json({ jobId })
  } catch (err) {
    // Best-effort cleanup on failure
    await fs.unlink(assembledPath).catch(() => {})
    await fs.rm(chunkDir, { recursive: true, force: true }).catch(() => {})
    const message = err instanceof Error ? err.message : 'Assembly failed'
    console.error(`[upload/assemble] error for job ${jobId}:`, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
