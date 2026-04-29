import { NextRequest, NextResponse } from 'next/server'
import { hashResetToken, updateAdminPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revokeAllSessions } from '@/lib/auth-state'

export async function POST(request: NextRequest) {
  let body: { token?: unknown; password?: unknown; confirmPassword?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  if (
    typeof body.token !== 'string' ||
    typeof body.password !== 'string' ||
    typeof body.confirmPassword !== 'string'
  ) {
    return NextResponse.json({ error: 'Token, password, and confirmation are required.' }, { status: 400 })
  }
  if (body.password !== body.confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 })
  }

  const tokenHash = hashResetToken(body.token)
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  })
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Reset token is invalid or has expired.' }, { status: 400 })
  }

  try {
    await updateAdminPassword(body.password)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update password.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  })
  await revokeAllSessions()

  return NextResponse.json({ ok: true })
}
