import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  DEFAULT_APP_SETTINGS,
  EMPTY_PREFERENCES,
  mapDbAppSettings,
  mapDbPreferences,
  parsePreferencesPayload,
  preferencesFromAppSettings,
} from '@/lib/settings'

const SETTINGS_ID = 1
const APP_SETTINGS_ID = 'singleton'

export async function GET() {
  const appSettings = await prisma.appSettings.findUnique({ where: { id: APP_SETTINGS_ID } })
  if (appSettings) {
    return NextResponse.json(preferencesFromAppSettings(mapDbAppSettings(appSettings)))
  }

  const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } })
  if (!settings) {
    return NextResponse.json(EMPTY_PREFERENCES)
  }

  return NextResponse.json(mapDbPreferences(settings))
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const parsed = parsePreferencesPayload(body)
  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error ?? 'Invalid preferences payload' }, { status: 400 })
  }

  const current = await prisma.appSettings.findUnique({ where: { id: APP_SETTINGS_ID } })
  const appSettings = current ? mapDbAppSettings(current) : DEFAULT_APP_SETTINGS
  const nextAppSettings = {
    ...appSettings,
    metadataDefaults: {
      ...appSettings.metadataDefaults,
      defaultLab: parsed.data.defaultLab,
      defaultDevelopProcess: parsed.data.defaultDevelopProcess,
      defaultFilmFormat: parsed.data.defaultFilmFormat,
      defaultCommonTags: parsed.data.defaultCommonTags,
    },
  }

  await prisma.appSettings.upsert({
    where: { id: APP_SETTINGS_ID },
    create: {
      id: APP_SETTINGS_ID,
      metadataDefaults: nextAppSettings.metadataDefaults as unknown as Prisma.InputJsonValue,
      importDefaults: nextAppSettings.importDefaults as unknown as Prisma.InputJsonValue,
      displayPreferences: nextAppSettings.displayPreferences as unknown as Prisma.InputJsonValue,
      libraryBehavior: nextAppSettings.libraryBehavior as unknown as Prisma.InputJsonValue,
      dataSafety: nextAppSettings.dataSafety as unknown as Prisma.InputJsonValue,
    },
    update: {
      metadataDefaults: nextAppSettings.metadataDefaults as unknown as Prisma.InputJsonValue,
      importDefaults: nextAppSettings.importDefaults as unknown as Prisma.InputJsonValue,
      displayPreferences: nextAppSettings.displayPreferences as unknown as Prisma.InputJsonValue,
      libraryBehavior: nextAppSettings.libraryBehavior as unknown as Prisma.InputJsonValue,
      dataSafety: nextAppSettings.dataSafety as unknown as Prisma.InputJsonValue,
    },
  })

  const saved = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      defaultLab: parsed.data.defaultLab,
      defaultDevelopProcess: parsed.data.defaultDevelopProcess,
      defaultFilmFormat: parsed.data.defaultFilmFormat,
      defaultCommonTags: parsed.data.defaultCommonTags,
    },
    update: {
      defaultLab: parsed.data.defaultLab,
      defaultDevelopProcess: parsed.data.defaultDevelopProcess,
      defaultFilmFormat: parsed.data.defaultFilmFormat,
      defaultCommonTags: parsed.data.defaultCommonTags,
    },
  })

  return NextResponse.json(mapDbPreferences(saved))
}
