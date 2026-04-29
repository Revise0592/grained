import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SESSION_COOKIE, buildSessionCookieOptions, verifySessionToken } from '@/lib/auth'
import { getAuthConfig } from '@/lib/auth-config'

export async function POST(request: NextRequest) {
  const auth = getAuthConfig()
  if (auth.mode === 'enabled') {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (token) {
      const payload = await verifySessionToken(token, auth.secret)
      if (payload) {
        await prisma.authSession.updateMany({
          where: { id: payload.sid, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { ...buildSessionCookieOptions(), maxAge: 0 })
  return response
}
