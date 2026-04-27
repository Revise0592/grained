import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAllowedRetentionDays } from '@/lib/settings'

type BackupPayload = {
  schemaVersion: number
  settings: {
    softDeleteRetentionDays: number
    backupReminderEnabled: boolean
  }
  cameras: Array<{ name: string }>
  filmStocks: Array<{ name: string; iso?: number | null }>
  tags: Array<{ name: string }>
  rolls: Array<{
    name: string
    slug: string
    description?: string | null
    filmStock?: string | null
    filmFormat?: string | null
    iso?: number | null
    pushPull?: string | null
    camera?: string | null
    lens?: string | null
    dateShotStart?: string | null
    dateShotEnd?: string | null
    lab?: string | null
    dateDeveloped?: string | null
    developProcess?: string | null
    coverPhotoId?: string | null
    notes?: string | null
    createdAt?: string
    updatedAt?: string
    deletedAt?: string | null
    tags?: string[]
    photos?: Array<{
      filename: string
      originalName: string
      path: string
      width?: number | null
      height?: number | null
      frameNumber?: number | null
      order?: number
      rotation?: number
      shutterSpeed?: string | null
      aperture?: string | null
      exposureComp?: string | null
      focalLength?: string | null
      notes?: string | null
      createdAt?: string
    }>
    comments?: Array<{ body: string; createdAt?: string }>
  }>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validatePayload(value: unknown): value is BackupPayload {
  if (!isObject(value)) return false
  if (value.schemaVersion !== 1) return false
  if (!isObject(value.settings)) return false

  const retention = Number(value.settings.softDeleteRetentionDays)
  if (!Number.isInteger(retention) || !isAllowedRetentionDays(retention)) return false
  if (typeof value.settings.backupReminderEnabled !== 'boolean') return false

  const arrays = ['cameras', 'filmStocks', 'tags', 'rolls'] as const
  return arrays.every((key) => Array.isArray(value[key]))
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!validatePayload(body)) {
    return NextResponse.json({ error: 'Invalid backup payload schema' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.photoComment.deleteMany()
    await tx.rollComment.deleteMany()
    await tx.photo.deleteMany()
    await tx.roll.deleteMany()
    await tx.savedCamera.deleteMany()
    await tx.savedFilmStock.deleteMany()
    await tx.tag.deleteMany()

    await tx.appSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        softDeleteRetentionDays: body.settings.softDeleteRetentionDays,
        backupReminderEnabled: body.settings.backupReminderEnabled,
      },
      update: {
        softDeleteRetentionDays: body.settings.softDeleteRetentionDays,
        backupReminderEnabled: body.settings.backupReminderEnabled,
      },
    })

    for (const camera of body.cameras) {
      if (typeof camera?.name !== 'string' || !camera.name.trim()) continue
      await tx.savedCamera.create({ data: { name: camera.name.trim() } })
    }

    for (const stock of body.filmStocks) {
      if (typeof stock?.name !== 'string' || !stock.name.trim()) continue
      await tx.savedFilmStock.create({
        data: {
          name: stock.name.trim(),
          iso: typeof stock.iso === 'number' ? stock.iso : null,
        },
      })
    }

    for (const tag of body.tags) {
      if (typeof tag?.name !== 'string' || !tag.name.trim()) continue
      await tx.tag.create({ data: { name: tag.name.trim() } })
    }

    for (const roll of body.rolls) {
      if (typeof roll?.name !== 'string' || !roll.name.trim()) continue
      if (typeof roll.slug !== 'string' || !roll.slug.trim()) continue

      const createdRoll = await tx.roll.create({
        data: {
          name: roll.name.trim(),
          slug: roll.slug.trim(),
          description: roll.description ?? null,
          filmStock: roll.filmStock ?? null,
          filmFormat: roll.filmFormat ?? null,
          iso: typeof roll.iso === 'number' ? roll.iso : null,
          pushPull: roll.pushPull ?? null,
          camera: roll.camera ?? null,
          lens: roll.lens ?? null,
          dateShotStart: roll.dateShotStart ? new Date(roll.dateShotStart) : null,
          dateShotEnd: roll.dateShotEnd ? new Date(roll.dateShotEnd) : null,
          lab: roll.lab ?? null,
          dateDeveloped: roll.dateDeveloped ? new Date(roll.dateDeveloped) : null,
          developProcess: roll.developProcess ?? null,
          coverPhotoId: roll.coverPhotoId ?? null,
          notes: roll.notes ?? null,
          deletedAt: roll.deletedAt ? new Date(roll.deletedAt) : null,
          createdAt: roll.createdAt ? new Date(roll.createdAt) : undefined,
          updatedAt: roll.updatedAt ? new Date(roll.updatedAt) : undefined,
          ...(roll.tags?.length
            ? {
                tags: {
                  connectOrCreate: roll.tags
                    .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
                    .map((tag) => ({
                      where: { name: tag.trim() },
                      create: { name: tag.trim() },
                    })),
                },
              }
            : {}),
        },
      })

      if (Array.isArray(roll.photos) && roll.photos.length > 0) {
        await tx.photo.createMany({
          data: roll.photos
            .filter((photo) => photo?.filename && photo?.originalName && photo?.path)
            .map((photo, index) => ({
              rollId: createdRoll.id,
              filename: photo.filename,
              originalName: photo.originalName,
              path: photo.path,
              width: typeof photo.width === 'number' ? photo.width : null,
              height: typeof photo.height === 'number' ? photo.height : null,
              frameNumber: typeof photo.frameNumber === 'number' ? photo.frameNumber : null,
              order: typeof photo.order === 'number' ? photo.order : index,
              rotation: typeof photo.rotation === 'number' ? photo.rotation : 0,
              shutterSpeed: photo.shutterSpeed ?? null,
              aperture: photo.aperture ?? null,
              exposureComp: photo.exposureComp ?? null,
              focalLength: photo.focalLength ?? null,
              notes: photo.notes ?? null,
              createdAt: photo.createdAt ? new Date(photo.createdAt) : new Date(),
            })),
        })
      }

      if (Array.isArray(roll.comments) && roll.comments.length > 0) {
        await tx.rollComment.createMany({
          data: roll.comments
            .filter((comment) => typeof comment?.body === 'string' && comment.body.trim().length > 0)
            .map((comment) => ({
              rollId: createdRoll.id,
              body: comment.body,
              createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
            })),
        })
      }
    }
  })

  return NextResponse.json({ ok: true })
}
