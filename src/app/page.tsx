import Link from 'next/link'
import { prisma } from '@/lib/db'
import { RollCard } from '@/components/roll-card'
import { TagFilter } from '@/components/tag-filter'
import { Film, Plus } from 'lucide-react'
import { DEFAULT_APP_SETTINGS, mapDbAppSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const { tag } = await searchParams

  const [rolls, allTags, appSettings, frameCount] = await Promise.all([
    prisma.roll.findMany({
      where: tag ? { tags: { some: { name: tag } } } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { photos: true, comments: true } },
        photos: {
          orderBy: { order: 'asc' },
          take: 1,
          select: { id: true, path: true, filename: true, rotation: true },
        },
        tags: { select: { name: true } },
      },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { rolls: true } } },
    }),
    prisma.appSettings.findUnique({ where: { id: 'singleton' } }),
    prisma.photo.count(),
  ])
  const displayPreferences = appSettings
    ? mapDbAppSettings(appSettings).displayPreferences
    : DEFAULT_APP_SETTINGS.displayPreferences

  const totalRolls = tag ? null : rolls.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pt-10">
      {rolls.length === 0 && !tag ? (
        <EmptyState />
      ) : (
        <>
          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[32px] sm:leading-10 font-medium tracking-tight text-foreground">
                {tag ? (
                  <><span className="text-muted-foreground">Tagged </span>{tag}</>
                ) : 'Rolls'}
              </h1>
              <p className="mt-1 font-mono text-[13px] text-muted-foreground tabular-nums">
                {rolls.length} {rolls.length === 1 ? 'roll' : 'rolls'}
                {totalRolls !== null && <> · {frameCount.toLocaleString()} {frameCount === 1 ? 'frame' : 'frames'}</>}
              </p>
            </div>
          </header>

          {allTags.length > 0 && (
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-6 overflow-x-auto no-scrollbar">
              <TagFilter tags={allTags} activeTag={tag} />
            </div>
          )}

          {rolls.length === 0 ? (
            <div className="flex flex-col items-start py-16">
              <p className="text-muted-foreground">No rolls tagged &ldquo;{tag}&rdquo;</p>
              <Link href="/" className="btn btn-secondary mt-4">View all rolls</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
              {rolls.map(roll => (
                <RollCard key={roll.id} roll={roll} preferences={displayPreferences} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Film className="h-8 w-8 text-muted-foreground mb-4" strokeWidth={1.5} />
      <h1 className="text-2xl font-medium tracking-tight text-foreground">Your archive is empty</h1>
      <p className="text-muted-foreground mt-2 max-w-sm leading-relaxed">
        Import a lab scan .zip or create a roll by hand. Grained keeps the frames, stock and notes together.
      </p>
      <Link
        href="/rolls/new"
        className="btn btn-primary mt-6"
      >
        <Plus className="h-4 w-4" />
        Add your first roll
      </Link>
    </div>
  )
}
