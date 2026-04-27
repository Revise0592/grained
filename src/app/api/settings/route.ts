import { NextRequest, NextResponse } from 'next/server'
import { getAppSettings, isAllowedRetentionDays } from '@/lib/settings'
import { prisma } from '@/lib/db'

export async function GET() {
  const settings = await getAppSettings()
  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const retention = Number(body.softDeleteRetentionDays)
  const reminder = Boolean(body.backupReminderEnabled)

  if (!Number.isInteger(retention) || !isAllowedRetentionDays(retention)) {
    return NextResponse.json(
      { error: 'softDeleteRetentionDays must be one of 0, 7, or 30' },
      { status: 400 }
    )
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      softDeleteRetentionDays: retention,
      backupReminderEnabled: reminder,
    },
    update: {
      softDeleteRetentionDays: retention,
      backupReminderEnabled: reminder,
    },
  })

  return NextResponse.json(settings)
}
