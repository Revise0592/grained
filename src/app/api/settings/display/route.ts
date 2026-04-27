import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  DEFAULT_DISPLAY_SETTINGS,
  normalizeDisplaySettings,
  getDisplaySettings,
} from '@/lib/display-settings'

export async function GET() {
  const settings = await getDisplaySettings()
  return NextResponse.json(settings)
}

export async function PUT(req: Request) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(DEFAULT_DISPLAY_SETTINGS)
  }

  const normalized = normalizeDisplaySettings(body)

  const updated = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: normalized,
    create: {
      id: 1,
      ...normalized,
    },
    select: {
      themeMode: true,
      cardDensity: true,
      dateDisplayFormat: true,
    },
  })

  return NextResponse.json(updated)
}
