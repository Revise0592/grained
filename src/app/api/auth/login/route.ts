import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  buildSessionCookieOptions,
  createSessionToken,
} from '@/lib/auth'
import { clearLoginFailures, getLoginThrottleStatus, getThrottleKey, recordLoginFailure } from '@/lib/auth-rate-limit'
import { getAuthConfig } from '@/lib/auth-config'

export async function POST(request: NextRequest) {
  let body: { password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const auth = getAuthConfig()
  if (auth.mode === 'disabled') {
    return NextResponse.json({ error: 'Auth is disabled' }, { status: 404 })
  }
  if (auth.mode === 'misconfigured') {
    return NextResponse.json({ error: auth.reason }, { status: 503 })
  }

  if (typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  const throttleKey = getThrottleKey(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  )
  const throttleStatus = getLoginThrottleStatus(throttleKey)
  if (!throttleStatus.allowed) {
    return NextResponse.json(
      { error: 'Too many failed login attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(throttleStatus.retryAfterSeconds),
        },
      },
    )
  }

  if (body.password !== auth.password) {
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

  const now = Date.now()
  const sessionId = randomBytes(16).toString('hex')
  const expiresAt = new Date(now + SESSION_TTL_MS)

  await prisma.authSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lte: new Date(now) } },
        { revokedAt: { not: null } },
      ],
    },
  })
  await prisma.authSession.create({
    data: {
      id: sessionId,
      expiresAt,
    },
  })

  const token = await createSessionToken(auth.secret, {
    sid: sessionId,
    iat: now,
    exp: expiresAt.getTime(),
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, buildSessionCookieOptions())

  return response
}
