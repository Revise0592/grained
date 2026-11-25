import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import path from 'path'
import { getUploadDir } from '@/lib/utils'

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params

  // Resolve to an absolute path and verify it stays inside the upload directory.
  const uploadDir = path.resolve(getUploadDir())
  const filePath = path.resolve(path.join(uploadDir, ...segments))
  if (!filePath.startsWith(uploadDir + path.sep)) {
    return new NextResponse(null, { status: 403 })
  }

  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) {
      return new NextResponse(null, { status: 404 })
    }
    const etag = `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`

    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304 })
    }

    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg'
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

    const fileStream = createReadStream(filePath)
    const webStream = Readable.toWeb(fileStream) as ReadableStream

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        // Scans are private: never let a shared proxy cache keep a copy.
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        ETag: etag,
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
