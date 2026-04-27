import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/server-settings'

export async function GET() {
  const settings = await getSettings()
  const filmStocks = await prisma.savedFilmStock.findMany({
    where: settings.library.showArchivedItems ? {} : { deletedAt: null },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(filmStocks)
}
