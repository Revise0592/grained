import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RollDetail } from './roll-detail'
import { getDisplaySettings } from '@/lib/display-settings'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const roll = await prisma.roll.findUnique({ where: { id }, select: { name: true } })
  return { title: roll ? `${roll.name} — Grained` : 'Roll — Grained' }
}

export default async function RollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [roll, displaySettings] = await Promise.all([
    prisma.roll.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
        tags: true,
      },
    }),
    getDisplaySettings(),
  ])

  if (!roll) notFound()

  return <RollDetail roll={roll} dateDisplayFormat={displaySettings.dateDisplayFormat} />
}
