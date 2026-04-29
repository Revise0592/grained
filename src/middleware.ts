import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './lib/db'
import { SESSION_COOKIE, buildSessionCookieOptions, verifySessionToken } from './lib/auth'
import { getAuthConfig } from './lib/auth-config'

export const runtime = 'nodejs'

function unauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

function authMisconfiguredResponse(request: NextRequest, message: string) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: message }, { status: 503 })
  }

  return new NextResponse(message, {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const auth = getAuthConfig()
  if (auth.mode === 'disabled') return NextResponse.next()

  if (pathname === '/api/health') {
    return NextResponse.next()
  }

  if (auth.mode === 'misconfigured') {
    return authMisconfiguredResponse(request, auth.reason)
  }

  // Always allow login page, auth API, and public stats
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/') || pathname === '/api/stats') {
    return NextResponse.next()
  }

  // API key auth for API clients — set API_KEY env var to enable
  if (auth.apiKey) {
    const authHeader = request.headers.get('authorization')
    if (authHeader === `Bearer ${auth.apiKey}`) {
      return NextResponse.next()
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return unauthorizedResponse(request)
  }

  const payload = await verifySessionToken(token, auth.secret)
  if (!payload) {
    const res = unauthorizedResponse(request)
    res.cookies.set(SESSION_COOKIE, '', { ...buildSessionCookieOptions(), maxAge: 0 })
    return res
  }

  const session = await prisma.authSession.findUnique({
    where: { id: payload.sid },
    select: { id: true, revokedAt: true, expiresAt: true },
  })
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    const res = unauthorizedResponse(request)
    res.cookies.set(SESSION_COOKIE, '', { ...buildSessionCookieOptions(), maxAge: 0 })
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
