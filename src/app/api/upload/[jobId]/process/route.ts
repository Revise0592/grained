import { NextRequest } from 'next/server'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import sharp from 'sharp'
import { prisma } from '@/lib/db'
import { isImageFile, getUploadDir } from '@/lib/utils'
import { generateUniqueSlug } from '@/lib/server-utils'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params

  // Validate jobId to prevent path traversal
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

      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client disconnected — ignore
        }
      }

      try {
        // ── 1. Load job metadata ──────────────────────────────────────────────
        let meta: { tmpZip: string; rollName: string; fileName: string }
        try {
          meta = JSON.parse(await fs.readFile(metaFile, 'utf-8'))
        } catch {
          send({ stage: 'error', message: 'Upload session not found or expired. Please upload again.' })
          controller.close()
          return
        }
        tmpZip = meta.tmpZip
        // Remove meta file immediately so it can't be replayed
        await fs.unlink(metaFile).catch(() => {})

        // ── 2. Open the ZIP ───────────────────────────────────────────────────
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
          .filter(e => {
            const name = path.basename(e.entryName)
            return !name.startsWith('.') && !name.startsWith('__') && isImageFile(name)
          })
          .sort((a, b) => a.entryName.localeCompare(b.entryName))

        if (imageEntries.length === 0) {
          send({
            stage: 'error',
            message:
              `No image files found in zip (${allEntries.length} total entr${allEntries.length === 1 ? 'y' : 'ies'}). ` +
              `Supported formats: JPG, TIFF, PNG, HEIC, WebP.`,
          })
          controller.close()
          return
        }

        const total = imageEntries.length
        send({ stage: 'extracting', message: `Found ${total} image${total === 1 ? '' : 's'} — creating roll…` })

        // ── 3. Create Roll in database ────────────────────────────────────────
        const name =
          meta.rollName ||
          meta.fileName.replace(/\.zip$/i, '').replace(/[-_]/g, ' ')
        const slug = await generateUniqueSlug(name)
        const roll = await prisma.roll.create({ data: { name, slug } })

        const uploadDir = getUploadDir()
        const rollDir = path.join(uploadDir, roll.id)
        const thumbDir = path.join(rollDir, 'thumbs')
        await fs.mkdir(rollDir, { recursive: true })
        await fs.mkdir(thumbDir, { recursive: true })

        // ── 4. Process each image ─────────────────────────────────────────────
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
          const entry = imageEntries[i]
          const originalName = path.basename(entry.entryName)
          const ext = path.extname(originalName).toLowerCase()
          const filename = `${String(i + 1).padStart(4, '0')}${ext}`

          send({ stage: 'processing', current: i + 1, total, name: originalName })

          const imgBuffer = entry.getData()
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
              .toFile(path.join(thumbDir, `${path.basename(filename, ext)}.jpg`))
          } catch {
            // Sharp can't process this format — continue without thumbnail
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

        // ── 5. Persist photos and signal completion ───────────────────────────
        await prisma.photo.createMany({ data: photoData })

        send({ stage: 'done', rollId: roll.id, count: photoData.length })
        try { controller.close() } catch { /* already closed */ }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Processing failed'
        send({ stage: 'error', message })
        try { controller.close() } catch { /* already closed */ }
      } finally {
        if (tmpZip) {
          await fs.unlink(tmpZip).catch(() => {})
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // Tell nginx/reverse-proxies not to buffer this stream
      'X-Accel-Buffering': 'no',
    },
  })
}
