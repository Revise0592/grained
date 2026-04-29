import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  buildSessionCookieOptions,
  createAdminPassword,
  createSessionToken,
} from '@/lib/auth'
import { getAuthState } from '@/lib/auth-state'

export async function POST(request: NextRequest) {
  let body: { password?: unknown; confirmPassword?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const authState = await getAuthState()
  if (authState === 'disabled') {
    return NextResponse.json({ error: 'Auth is disabled' }, { status: 404 })
  }
  if (authState === 'enabled') {
    return NextResponse.json({ error: 'Admin account has already been created.' }, { status: 409 })
  }

  if (typeof body.password !== 'string' || typeof body.confirmPassword !== 'string') {
    return NextResponse.json({ error: 'Password and confirmation are required.' }, { status: 400 })
  }
  if (body.password !== body.confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 })
  }

  try {
    await createAdminPassword(body.password)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create admin password.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const sessionId = createSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await prisma.authSession.create({
    data: {
      id: sessionId,
      expiresAt,
    },
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, sessionId, buildSessionCookieOptions(request))
  return response
}
