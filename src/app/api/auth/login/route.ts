import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  buildSessionCookieOptions,
  createSessionToken,
  getAdminAccountForAuth,
  verifyPassword,
} from '@/lib/auth'
import { clearLoginFailures, getLoginThrottleStatus, getThrottleKey, recordLoginFailure } from '@/lib/auth-rate-limit'
import { getAuthState } from '@/lib/auth-state'

export async function POST(request: NextRequest) {
  let body: { password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const authState = await getAuthState()
  if (authState === 'disabled') {
    return NextResponse.json({ error: 'Auth is disabled' }, { status: 404 })
  }
  if (authState === 'setup-required') {
    return NextResponse.json({ error: 'Admin setup is required before signing in.' }, { status: 409 })
  }

  if (typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  const admin = await getAdminAccountForAuth()
  if (!admin) {
    return NextResponse.json({ error: 'Admin setup is required before signing in.' }, { status: 409 })
  }

  const throttleKey = getThrottleKey(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  )
  const throttleStatus = getLoginThrottleStatus(throttleKey)
  if (!throttleStatus.allowed) {
    return NextResponse.json(
      { error: 'Too many failed login attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(throttleStatus.retryAfterSeconds) } },
    )
  }

  const validPassword = await verifyPassword(body.password, admin.passwordSalt, admin.passwordHash)
  if (!validPassword) {
    if (throttleStatus.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, throttleStatus.delayMs))
    }
    const state = recordLoginFailure(throttleKey)
    if (state.lockUntil > Date.now()) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((state.lockUntil - Date.now()) / 1000))),
          },
        },
      )
    }
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  clearLoginFailures(throttleKey)

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
