import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'
import { getUploadDir, thumbPath as toThumbPath } from '@/lib/utils'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  })
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(photo)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { frameNumber, shutterSpeed, aperture, exposureComp, focalLength, notes, rotation } = body

  const photo = await prisma.photo.update({
    where: { id },
    data: {
      frameNumber: frameNumber !== undefined ? (frameNumber !== null ? Number(frameNumber) : null) : undefined,
      shutterSpeed: shutterSpeed !== undefined ? shutterSpeed : undefined,
      aperture: aperture !== undefined ? aperture : undefined,
      exposureComp: exposureComp !== undefined ? exposureComp : undefined,
      focalLength: focalLength !== undefined ? focalLength : undefined,
      notes: notes !== undefined ? notes : undefined,
      rotation: rotation !== undefined ? Number(rotation) : undefined,
    },
  })
  return NextResponse.json(photo)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const photo = await prisma.photo.findUnique({ where: { id } })
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.photo.delete({ where: { id } })

  const uploadDir = getUploadDir()
  try {
    await fs.unlink(path.join(uploadDir, photo.path))
    await fs.unlink(path.join(uploadDir, toThumbPath(photo.path)))
  } catch {
    // Files may already be gone
  }

  return new NextResponse(null, { status: 204 })
}
