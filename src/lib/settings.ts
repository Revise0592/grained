import { prisma } from '@/lib/db'

export const ALLOWED_RETENTION_DAYS = [0, 7, 30] as const

export function isAllowedRetentionDays(value: number): value is (typeof ALLOWED_RETENTION_DAYS)[number] {
  return ALLOWED_RETENTION_DAYS.includes(value as (typeof ALLOWED_RETENTION_DAYS)[number])
}

export async function getAppSettings() {
  const existing = await prisma.appSettings.findUnique({ where: { id: 'default' } })
  if (existing) return existing

  return prisma.appSettings.create({
    data: {
      id: 'default',
      softDeleteRetentionDays: 30,
      backupReminderEnabled: true,
    },
  })
}
