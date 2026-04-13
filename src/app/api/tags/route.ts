import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { rolls: true } } },
  })
  return NextResponse.json(tags)
}
