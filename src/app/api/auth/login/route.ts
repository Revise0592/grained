import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, COOKIE_MAX_AGE, createSessionToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  const correctPassword = process.env.AUTH_PASSWORD
  const secret = process.env.SESSION_SECRET

  if (!correctPassword || !secret) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }

  if (password !== correctPassword) {
    // Small delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 500))
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const token = await createSessionToken(secret)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return response
}
