import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SESSION_COOKIE, buildSessionCookieOptions, isValidSessionToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token && isValidSessionToken(token)) {
    await prisma.authSession.updateMany({
      where: { id: token, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { ...buildSessionCookieOptions(request), maxAge: 0 })
  return response
}
