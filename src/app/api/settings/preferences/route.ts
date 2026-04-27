import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EMPTY_PREFERENCES, mapDbPreferences, parsePreferencesPayload } from '@/lib/settings'

const SETTINGS_ID = 1

export async function GET() {
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
