import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const [rolls, photos] = await Promise.all([
    prisma.roll.count({ where: { deletedAt: null } }),
    prisma.photo.count({ where: { roll: { deletedAt: null } } }),
  ])
  return NextResponse.json({ rolls, photos })
}
