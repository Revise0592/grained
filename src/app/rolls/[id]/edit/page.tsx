import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { prisma } from '@/lib/db'
import { RollForm } from '@/components/roll-form'

export const dynamic = 'force-dynamic'

export default async function EditRollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const roll = await prisma.roll.findUnique({ where: { id }, include: { tags: true } })
  if (!roll) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-10 sm:pt-6">
      <Link
        href={`/rolls/${id}`}
        className="inline-flex h-11 sm:h-8 max-w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 sm:mb-4"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="truncate">{roll.name}</span>
      </Link>

      <h1 className="text-[28px] leading-9 sm:text-[40px] sm:leading-[48px] font-medium tracking-tight text-foreground mb-6">Edit roll</h1>

      <RollForm initial={roll} rollId={id} initialTags={roll.tags.map(t => t.name)} />
    </div>
  )
}
