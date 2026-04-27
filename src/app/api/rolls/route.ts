import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateUniqueSlug } from '@/lib/server-utils'
import { applyMetadataDefaultsToRoll, DEFAULT_APP_SETTINGS, mapDbAppSettings } from '@/lib/settings'

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
  const appSettingsRecord = await prisma.appSettings.findUnique({ where: { id: 'singleton' } })
  const appSettings = appSettingsRecord
    ? mapDbAppSettings(appSettingsRecord)
    : DEFAULT_APP_SETTINGS
  const metadataApplied = applyMetadataDefaultsToRoll({
    filmFormat,
    camera,
    lens,
    lab,
    developProcess,
    tags: tags as string[] | undefined,
  }, appSettings)

  const roll = await prisma.roll.create({
    data: {
      name: name.trim(), slug, description, filmStock,
      filmFormat: metadataApplied.filmFormat,
      iso: iso ? Number(iso) : null, pushPull, camera: metadataApplied.camera, lens: metadataApplied.lens,
      dateShotStart: dateShotStart ? new Date(dateShotStart) : null,
      dateShotEnd: dateShotEnd ? new Date(dateShotEnd) : null,
      lab: metadataApplied.lab, dateDeveloped: dateDeveloped ? new Date(dateDeveloped) : null,
      developProcess: metadataApplied.developProcess, notes,
      ...(metadataApplied.tags?.length && {
        tags: {
          connectOrCreate: metadataApplied.tags.map((tagName: string) => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        },
      }),
    },
  })

  const libraryBehavior = appSettings.libraryBehavior

  await Promise.all([
    libraryBehavior.saveCamerasAutomatically && roll.camera
      ? prisma.savedCamera.upsert({ where: { name: roll.camera }, update: {}, create: { name: roll.camera } })
      : null,
    libraryBehavior.saveFilmStocksAutomatically && roll.filmStock
      ? prisma.savedFilmStock.upsert({ where: { name: roll.filmStock }, update: {}, create: { name: roll.filmStock, iso: roll.iso ?? null } })
      : null,
  ])

  return NextResponse.json(roll, { status: 201 })
}
