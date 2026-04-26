import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken, resolveSecret } from './lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // If no password is configured, auth is disabled.
  // Bracket notation prevents SWC/webpack from inlining these at build time,
  // ensuring they are always read from the runtime environment (e.g. Docker env vars set by Unraid).
  const password = process.env['AUTH_PASSWORD']
  const secret = await resolveSecret(process.env['SESSION_SECRET'], password)
  if (!password || !secret) return NextResponse.next()

  // Always allow login page, auth API, and public stats
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/') || pathname === '/api/stats') {
    return NextResponse.next()
  }

  // API key auth for API clients — set API_KEY env var to enable
  const apiKey = process.env['API_KEY']
  if (apiKey) {
    const authHeader = request.headers.get('authorization')
    if (authHeader === `Bearer ${apiKey}`) {
      return NextResponse.next()
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const valid = await verifySessionToken(token, secret)
  if (!valid) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
