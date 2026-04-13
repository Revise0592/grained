import Link from 'next/link'
import { prisma } from '@/lib/db'
import { RollCard } from '@/components/roll-card'
import { TagFilter } from '@/components/tag-filter'
import { Film, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const { tag } = await searchParams

  const [rolls, allTags] = await Promise.all([
    prisma.roll.findMany({
      where: tag ? { tags: { some: { name: tag } } } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { photos: true, comments: true } },
        photos: {
          orderBy: { order: 'asc' },
          take: 1,
          select: { id: true, path: true, filename: true },
        },
        tags: { select: { name: true } },
      },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { rolls: true } } },
    }),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {allTags.length > 0 && (
        <div className="mb-6">
          <TagFilter tags={allTags} activeTag={tag} />
        </div>
      )}

      {rolls.length === 0 ? (
        tag ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
            <p className="text-muted-foreground text-sm">No rolls tagged &ldquo;{tag}&rdquo;.</p>
            <Link href="/" className="mt-3 text-sm text-accent hover:underline">
              View all rolls
            </Link>
          </div>
        ) : (
          <EmptyState />
        )
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {tag ? (
                  <span>
                    <span className="text-muted-foreground font-normal">Tagged: </span>
                    {tag}
                  </span>
                ) : 'All Rolls'}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {rolls.length} {rolls.length === 1 ? 'roll' : 'rolls'}{tag ? ' with this tag' : ' in the archive'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {rolls.map(roll => (
              <RollCard key={roll.id} roll={roll} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Film className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Your archive is empty</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        Import a roll from a lab .zip or create one manually to start building your film archive.
      </p>
      <Link
        href="/rolls/new"
        className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Your First Roll
      </Link>
    </div>
  )
}
