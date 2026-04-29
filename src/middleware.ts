import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './lib/db'
import { SESSION_COOKIE, buildSessionCookieOptions, isValidSessionToken } from './lib/auth'
import { getAuthConfig } from './lib/auth-config'
import { getAuthState } from './lib/auth-state'

export const runtime = 'nodejs'

function unauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

function setupRequiredResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Admin setup is required.' }, { status: 503 })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authConfig = getAuthConfig()
  if (authConfig.disabled) return NextResponse.next()

  if (pathname === '/api/health') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/') || pathname === '/api/stats') {
    return NextResponse.next()
  }

  const authState = await getAuthState()
  if (authState === 'setup-required') {
    return setupRequiredResponse(request)
  }

  if (authConfig.apiKey) {
    const authHeader = request.headers.get('authorization')
    if (authHeader === `Bearer ${authConfig.apiKey}`) {
      return NextResponse.next()
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token || !isValidSessionToken(token)) {
    return unauthorizedResponse(request)
  }

  const session = await prisma.authSession.findUnique({
    where: { id: token },
    select: { id: true, revokedAt: true, expiresAt: true },
  })
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    const res = unauthorizedResponse(request)
    res.cookies.set(SESSION_COOKIE, '', { ...buildSessionCookieOptions(request), maxAge: 0 })
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
