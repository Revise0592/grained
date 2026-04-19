import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const cameras = await prisma.savedCamera.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(cameras)
}
