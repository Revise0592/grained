import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const [rolls, photos] = await Promise.all([
    prisma.roll.count(),
    prisma.photo.count(),
  ])
  return NextResponse.json({ rolls, photos })
}
