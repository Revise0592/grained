import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { prisma } from '@/lib/db'
import { RollForm } from '@/components/roll-form'

export const dynamic = 'force-dynamic'

export default async function EditRollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const roll = await prisma.roll.findUnique({ where: { id } })
  if (!roll) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/rolls/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {roll.name}
      </Link>

      <h1 className="text-xl font-semibold text-foreground mb-6">Edit Roll</h1>

      <RollForm initial={roll} rollId={id} />
    </div>
  )
}
