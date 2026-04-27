import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAppSettings } from '@/lib/settings'

export async function GET() {
  const [settings, cameras, filmStocks, tags, rolls] = await Promise.all([
    getAppSettings(),
    prisma.savedCamera.findMany({ orderBy: { name: 'asc' } }),
    prisma.savedFilmStock.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    prisma.roll.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        tags: { select: { name: true } },
        photos: {
          orderBy: { order: 'asc' },
          select: {
            filename: true,
            originalName: true,
            path: true,
            width: true,
            height: true,
            frameNumber: true,
            order: true,
            rotation: true,
            shutterSpeed: true,
            aperture: true,
            exposureComp: true,
            focalLength: true,
            notes: true,
            createdAt: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: { body: true, createdAt: true },
        },
      },
    }),
  ])

  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      softDeleteRetentionDays: settings.softDeleteRetentionDays,
      backupReminderEnabled: settings.backupReminderEnabled,
    },
    cameras,
    filmStocks,
    tags,
    rolls: rolls.map((roll) => ({
      ...roll,
      tags: roll.tags.map((tag) => tag.name),
    })),
  }

  return NextResponse.json(payload, {
    headers: {
      'Content-Disposition': `attachment; filename="grained-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
