import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  DEFAULT_APP_SETTINGS,
  mapDbAppSettings,
  parseAppSettingsPayload,
} from '@/lib/settings'

const SETTINGS_ID = 'singleton'

export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
  if (!settings) {
    return NextResponse.json(DEFAULT_APP_SETTINGS)
  }

  return NextResponse.json(mapDbAppSettings(settings))
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const parsed = parseAppSettingsPayload(body)

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error ?? 'Invalid settings payload' }, { status: 400 })
  }

  const saved = await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      metadataDefaults: parsed.data.metadataDefaults as unknown as Prisma.InputJsonValue,
      importDefaults: parsed.data.importDefaults as unknown as Prisma.InputJsonValue,
      displayPreferences: parsed.data.displayPreferences as unknown as Prisma.InputJsonValue,
      libraryBehavior: parsed.data.libraryBehavior as unknown as Prisma.InputJsonValue,
      dataSafety: parsed.data.dataSafety as unknown as Prisma.InputJsonValue,
    },
    update: {
      metadataDefaults: parsed.data.metadataDefaults as unknown as Prisma.InputJsonValue,
      importDefaults: parsed.data.importDefaults as unknown as Prisma.InputJsonValue,
      displayPreferences: parsed.data.displayPreferences as unknown as Prisma.InputJsonValue,
      libraryBehavior: parsed.data.libraryBehavior as unknown as Prisma.InputJsonValue,
      dataSafety: parsed.data.dataSafety as unknown as Prisma.InputJsonValue,
    },
  })

  await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      defaultLab: parsed.data.metadataDefaults.defaultLab,
      defaultDevelopProcess: parsed.data.metadataDefaults.defaultDevelopProcess,
      defaultFilmFormat: parsed.data.metadataDefaults.defaultFilmFormat,
      defaultCommonTags: parsed.data.metadataDefaults.defaultCommonTags,
    },
    update: {
      defaultLab: parsed.data.metadataDefaults.defaultLab,
      defaultDevelopProcess: parsed.data.metadataDefaults.defaultDevelopProcess,
      defaultFilmFormat: parsed.data.metadataDefaults.defaultFilmFormat,
      defaultCommonTags: parsed.data.metadataDefaults.defaultCommonTags,
    },
  })

  return NextResponse.json(mapDbAppSettings(saved))
}
