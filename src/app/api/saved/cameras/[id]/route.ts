import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/server-settings'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const settings = await getSettings()

  const existing = await prisma.savedCamera.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND', message: 'Camera not found.' }, { status: 404 })

  if (settings.library.enableSoftDelete) {
    await prisma.savedCamera.update({ where: { id }, data: { deletedAt: new Date() } })
    return new NextResponse(null, { status: 204 })
  }

  await prisma.savedCamera.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
