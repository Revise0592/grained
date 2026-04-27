import { Prisma, PrismaClient } from '@prisma/client'
import { DEFAULT_APP_SETTINGS } from '@/lib/settings'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; appSettingsSeeded?: Promise<void> }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

async function seedDefaultSettings() {
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      metadataDefaults: DEFAULT_APP_SETTINGS.metadataDefaults as unknown as Prisma.InputJsonValue,
      importDefaults: DEFAULT_APP_SETTINGS.importDefaults as unknown as Prisma.InputJsonValue,
      displayPreferences: DEFAULT_APP_SETTINGS.displayPreferences as unknown as Prisma.InputJsonValue,
      libraryBehavior: DEFAULT_APP_SETTINGS.libraryBehavior as unknown as Prisma.InputJsonValue,
      dataSafety: DEFAULT_APP_SETTINGS.dataSafety as unknown as Prisma.InputJsonValue,
    },
  })
}

const appSettingsSeeded = globalForPrisma.appSettingsSeeded ?? seedDefaultSettings()
globalForPrisma.appSettingsSeeded = appSettingsSeeded

export async function ensureAppSettingsInitialized() {
  await appSettingsSeeded
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
