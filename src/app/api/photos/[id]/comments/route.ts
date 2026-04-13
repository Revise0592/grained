import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const comments = await prisma.photoComment.findMany({
    where: { photoId: id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { body } = await request.json()
  if (!body?.trim()) {
    return NextResponse.json({ error: 'Comment body required' }, { status: 400 })
  }
  const comment = await prisma.photoComment.create({
    data: { photoId: id, body: body.trim() },
  })
  return NextResponse.json(comment, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _photoId } = await params
  const { searchParams } = new URL(request.url)
  const commentId = searchParams.get('commentId')
  if (!commentId) {
    return NextResponse.json({ error: 'commentId required' }, { status: 400 })
  }
  await prisma.photoComment.delete({ where: { id: commentId } })
  return new NextResponse(null, { status: 204 })
}
