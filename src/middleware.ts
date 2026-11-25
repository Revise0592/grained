import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './lib/db'
import { SESSION_COOKIE, buildSessionCookieOptions, hasValidApiKey, isValidSessionToken } from './lib/auth'
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

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Reject state-changing requests that a browser sent from another site.
// Sec-Fetch-Site is set by the browser and survives reverse proxies that rewrite Host,
// so it is checked first; Origin is the fallback for older browsers.
function isCrossSiteWrite(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite) return fetchSite !== 'same-origin' && fetchSite !== 'none'

  const origin = request.headers.get('origin')
  if (!origin) return false // Non-browser clients (curl, scripts) send no Origin.

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return true
  }
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host')
  return !host || originHost !== host
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authConfig = getAuthConfig()

  if (isCrossSiteWrite(request)) {
    return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 })
  }

  if (authConfig.disabled) return NextResponse.next()

  if (pathname === '/api/health') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  const authState = await getAuthState()
  if (authState === 'setup-required') {
    return setupRequiredResponse(request)
  }

  if (authConfig.apiKey && hasValidApiKey(request.headers.get('authorization'), authConfig.apiKey)) {
    return NextResponse.next()
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
