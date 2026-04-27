import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateUniqueSlug } from '@/lib/server-utils'
import { getSettings } from '@/lib/server-settings'

export async function GET() {
  const rolls = await prisma.roll.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { photos: true, comments: true } },
      photos: {
        orderBy: { order: 'asc' },
        take: 1,
        select: { id: true, path: true, filename: true },
      },
      tags: { select: { name: true } },
    },
  })
  return NextResponse.json(rolls)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, description, filmStock, filmFormat, iso, pushPull, camera, lens,
    dateShotStart, dateShotEnd, lab, dateDeveloped, developProcess, notes, tags } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const slug = await generateUniqueSlug(name)
  const roll = await prisma.roll.create({
    data: {
      name: name.trim(), slug, description, filmStock, filmFormat,
      iso: iso ? Number(iso) : null, pushPull, camera, lens,
      dateShotStart: dateShotStart ? new Date(dateShotStart) : null,
      dateShotEnd: dateShotEnd ? new Date(dateShotEnd) : null,
      lab, dateDeveloped: dateDeveloped ? new Date(dateDeveloped) : null,
      developProcess, notes,
      ...(tags?.length && {
        tags: {
          connectOrCreate: (tags as string[]).map((tagName: string) => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        },
      }),
    },
  })

  const settings = await getSettings()
  if (settings.import.autoSaveLibraryItems) {
    await Promise.all([
      camera ? prisma.savedCamera.upsert({ where: { name: camera }, update: { deletedAt: null }, create: { name: camera } }) : null,
      filmStock ? prisma.savedFilmStock.upsert({ where: { name: filmStock }, update: { deletedAt: null, iso: iso ? Number(iso) : null }, create: { name: filmStock, iso: iso ? Number(iso) : null } }) : null,
    ])
  }

  return NextResponse.json(roll, { status: 201 })
}
