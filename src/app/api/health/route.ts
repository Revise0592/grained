import { NextResponse } from 'next/server'
import { getAuthConfig } from '@/lib/auth-config'

export function GET() {
  const auth = getAuthConfig()
  const body = {
    status: auth.mode === 'misconfigured' ? 'error' : 'ok',
    auth: auth.mode,
  }
  return NextResponse.json(body, { status: auth.mode === 'misconfigured' ? 503 : 200 })
}
