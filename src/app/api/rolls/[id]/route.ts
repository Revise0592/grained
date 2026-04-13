import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { slugify, getUploadDir } from '@/lib/utils'
import fs from 'fs/promises'
import path from 'path'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const roll = await prisma.roll.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { order: 'asc' } },
      comments: { orderBy: { createdAt: 'asc' } },
      _count: { select: { photos: true } },
    },
  })
  if (!roll) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(roll)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { name, description, filmStock, filmFormat, iso, pushPull, camera, lens,
    dateShotStart, dateShotEnd, lab, dateDeveloped, developProcess, notes, coverPhotoId, tags } = body

  const existing = await prisma.roll.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let slug = existing.slug
  if (name && name.trim() !== existing.name) {
    const base = slugify(name.trim())
    slug = base
    let i = 1
    while (true) {
      const conflict = await prisma.roll.findUnique({ where: { slug } })
      if (!conflict || conflict.id === id) break
      slug = `${base}-${i++}`
    }
  }

  const roll = await prisma.roll.update({
    where: { id },
    data: {
      name: name?.trim() ?? existing.name,
      slug,
      description: description ?? existing.description,
      filmStock: filmStock ?? existing.filmStock,
      filmFormat: filmFormat ?? existing.filmFormat,
      iso: iso !== undefined ? (iso ? Number(iso) : null) : existing.iso,
      pushPull: pushPull ?? existing.pushPull,
      camera: camera ?? existing.camera,
      lens: lens ?? existing.lens,
      dateShotStart: dateShotStart !== undefined ? (dateShotStart ? new Date(dateShotStart) : null) : existing.dateShotStart,
      dateShotEnd: dateShotEnd !== undefined ? (dateShotEnd ? new Date(dateShotEnd) : null) : existing.dateShotEnd,
      lab: lab ?? existing.lab,
      dateDeveloped: dateDeveloped !== undefined ? (dateDeveloped ? new Date(dateDeveloped) : null) : existing.dateDeveloped,
      developProcess: developProcess ?? existing.developProcess,
      notes: notes ?? existing.notes,
      coverPhotoId: coverPhotoId !== undefined ? coverPhotoId : existing.coverPhotoId,
      ...(tags !== undefined && {
        tags: {
          set: [],
          connectOrCreate: (tags as string[]).map(name => ({
            where: { name },
            create: { name },
          })),
        },
      }),
    },
  })

  return NextResponse.json(roll)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const roll = await prisma.roll.findUnique({ where: { id } })
  if (!roll) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.roll.delete({ where: { id } })

  const dir = path.join(getUploadDir(), id)
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    // Directory may not exist
  }

  return new NextResponse(null, { status: 204 })
}
