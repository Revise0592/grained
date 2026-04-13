import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateUniqueSlug } from '@/lib/server-utils'

export async function GET() {
  const rolls = await prisma.roll.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { photos: true, comments: true } },
      photos: {
        orderBy: { order: 'asc' },
        take: 1,
        select: { id: true, path: true, filename: true },
      },
    },
  })
  return NextResponse.json(rolls)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, description, filmStock, filmFormat, iso, pushPull, camera, lens,
    dateShotStart, dateShotEnd, lab, dateDeveloped, developProcess, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const slug = await generateUniqueSlug(name)
  const roll = await prisma.roll.create({
    data: {
      name: name.trim(), slug, description, filmStock, filmFormat,
      iso: iso ? Number(iso) : null, pushPull, camera, lens,
      dateShotStart: dateShotStart ? new Date(dateShotStart) : null,
      dateShotEnd: dateShotEnd ? new Date(dateShotEnd) : null,
      lab, dateDeveloped: dateDeveloped ? new Date(dateDeveloped) : null,
      developProcess, notes,
    },
  })

  return NextResponse.json(roll, { status: 201 })
}
