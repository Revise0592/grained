import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SETTINGS_ID } from '@/lib/server-settings'
import { validateSettingsPayload, withSettingsDefaults } from '@/lib/settings'

export async function GET() {
  const row = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
  return NextResponse.json({ exportedAt: new Date().toISOString(), settings: withSettingsDefaults(row) })
}

export async function POST(req: NextRequest) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const settingsPayload = (payload && typeof payload === 'object' && 'settings' in payload)
    ? (payload as { settings: unknown }).settings
    : payload

  const { data, errors } = validateSettingsPayload(settingsPayload)
  if (!data || errors) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Backup import payload is invalid.', details: errors ?? [] },
      { status: 422 },
    )
  }

  const row = await prisma.appSettings.upsert({
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

  return NextResponse.json({ settings: withSettingsDefaults(row), imported: true })
}
