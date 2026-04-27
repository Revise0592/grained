import { cache } from 'react'
import { prisma } from '@/lib/db'
import { DEFAULT_SETTINGS, withSettingsDefaults } from '@/lib/settings'

export const SETTINGS_ID = 'default'

export const getSettings = cache(async () => {
  try {
    const row = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
    return withSettingsDefaults(row)
  } catch {
    return DEFAULT_SETTINGS
  }
})
