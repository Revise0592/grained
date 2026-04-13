import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RollDetail } from './roll-detail'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const roll = await prisma.roll.findUnique({ where: { id }, select: { name: true } })
  return { title: roll ? `${roll.name} — Grained` : 'Roll — Grained' }
}

export default async function RollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const roll = await prisma.roll.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { order: 'asc' } },
      comments: { orderBy: { createdAt: 'asc' } },
      tags: true,
    },
  })

  if (!roll) notFound()

  return <RollDetail roll={roll} />
}
