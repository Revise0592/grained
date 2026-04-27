import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withSettingsDefaults, validateSettingsPayload } from '@/lib/settings'

const SETTINGS_ID = 'default'

export async function GET() {
  const row = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
  return NextResponse.json({ settings: withSettingsDefaults(row) })
}

export async function PUT(req: NextRequest) {
  let payload: unknown

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { data, errors } = validateSettingsPayload(payload)
  if (!data || errors) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Settings payload is invalid.', details: errors ?? [] },
      { status: 422 },
    )
  }

  const saved = await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      appName: data.metadata.appName,
      appDescription: data.metadata.appDescription,
      autoSaveLibraryItems: data.import.autoSaveLibraryItems,
      allowDuplicateFilenames: data.import.allowDuplicateFilenames,
      defaultTheme: data.display.defaultTheme,
      showStatsBar: data.display.showStatsBar,
      showArchivedItems: data.library.showArchivedItems,
      enableSoftDelete: data.library.enableSoftDelete,
      confirmDestructiveActions: data.safety.confirmDestructiveActions,
      redactSensitiveMetadata: data.safety.redactSensitiveMetadata,
    },
    create: {
      id: SETTINGS_ID,
      appName: data.metadata.appName,
      appDescription: data.metadata.appDescription,
      autoSaveLibraryItems: data.import.autoSaveLibraryItems,
      allowDuplicateFilenames: data.import.allowDuplicateFilenames,
      defaultTheme: data.display.defaultTheme,
      showStatsBar: data.display.showStatsBar,
      showArchivedItems: data.library.showArchivedItems,
      enableSoftDelete: data.library.enableSoftDelete,
      confirmDestructiveActions: data.safety.confirmDestructiveActions,
      redactSensitiveMetadata: data.safety.redactSensitiveMetadata,
    },
  })

  return NextResponse.json({ settings: withSettingsDefaults(saved) })
}
