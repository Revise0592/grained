import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const stocks = await prisma.savedFilmStock.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(stocks)
}
