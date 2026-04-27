import { prisma } from '@/lib/db'
import { getAppSettings } from '@/lib/settings'

export async function purgeExpiredDeletedRolls() {
  const settings = await getAppSettings()
  const retentionDays = settings.softDeleteRetentionDays

  if (retentionDays <= 0) {
    return 0
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  const result = await prisma.roll.deleteMany({
    where: {
      deletedAt: {
        not: null,
        lte: cutoff,
      },
    },
  })

  return result.count
}
