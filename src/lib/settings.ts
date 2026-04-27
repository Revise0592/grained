import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export type RollSortField = 'createdAt' | 'dateShotStart' | 'name'
export type SortOrder = 'asc' | 'desc'
export type RollFilterPreset = 'all' | 'cameraStockOnly'

export interface StatsModules {
  rolls: boolean
  photos: boolean
}

export interface LibraryBehaviorSettings {
  rollSortField: RollSortField
  rollSortOrder: SortOrder
  rollFilterPreset: RollFilterPreset
  showStatsBar: boolean
  statsModules: StatsModules
}

export const DEFAULT_LIBRARY_BEHAVIOR_SETTINGS: LibraryBehaviorSettings = {
  rollSortField: 'createdAt',
  rollSortOrder: 'desc',
  rollFilterPreset: 'all',
  showStatsBar: true,
  statsModules: {
    rolls: true,
    photos: true,
  },
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeLibraryBehaviorSettings(value: unknown): LibraryBehaviorSettings {
  if (!isObject(value)) return DEFAULT_LIBRARY_BEHAVIOR_SETTINGS

  const rollSortField: RollSortField =
    value.rollSortField === 'dateShotStart' || value.rollSortField === 'name' || value.rollSortField === 'createdAt'
      ? value.rollSortField
      : DEFAULT_LIBRARY_BEHAVIOR_SETTINGS.rollSortField

  const rollSortOrder: SortOrder =
    value.rollSortOrder === 'asc' || value.rollSortOrder === 'desc'
      ? value.rollSortOrder
      : DEFAULT_LIBRARY_BEHAVIOR_SETTINGS.rollSortOrder

  const rollFilterPreset: RollFilterPreset =
    value.rollFilterPreset === 'cameraStockOnly' || value.rollFilterPreset === 'all'
      ? value.rollFilterPreset
      : DEFAULT_LIBRARY_BEHAVIOR_SETTINGS.rollFilterPreset

  const showStatsBar =
    typeof value.showStatsBar === 'boolean'
      ? value.showStatsBar
      : DEFAULT_LIBRARY_BEHAVIOR_SETTINGS.showStatsBar

  const statsModulesSource = isObject(value.statsModules) ? value.statsModules : {}
  const statsModules: StatsModules = {
    rolls:
      typeof statsModulesSource.rolls === 'boolean'
        ? statsModulesSource.rolls
        : DEFAULT_LIBRARY_BEHAVIOR_SETTINGS.statsModules.rolls,
    photos:
      typeof statsModulesSource.photos === 'boolean'
        ? statsModulesSource.photos
        : DEFAULT_LIBRARY_BEHAVIOR_SETTINGS.statsModules.photos,
  }

  return {
    rollSortField,
    rollSortOrder,
    rollFilterPreset,
    showStatsBar,
    statsModules,
  }
}

export async function getLibraryBehaviorSettings(): Promise<LibraryBehaviorSettings> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'libraryBehavior' } })
  return normalizeLibraryBehaviorSettings(setting?.value)
}

export async function updateLibraryBehaviorSettings(
  incoming: unknown,
): Promise<LibraryBehaviorSettings> {
  const current = await getLibraryBehaviorSettings()
  const next = normalizeLibraryBehaviorSettings({
    ...current,
    ...(isObject(incoming) ? incoming : {}),
    statsModules: {
      ...current.statsModules,
      ...(isObject(incoming) && isObject(incoming.statsModules) ? incoming.statsModules : {}),
    },
  })

  await prisma.appSetting.upsert({
    where: { key: 'libraryBehavior' },
    update: { value: next as unknown as Prisma.InputJsonValue },
    create: { key: 'libraryBehavior', value: next as unknown as Prisma.InputJsonValue },
  })

  return next
}
