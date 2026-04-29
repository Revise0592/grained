import { NextResponse } from 'next/server'
import { getAuthState } from '@/lib/auth-state'

export async function GET() {
  const auth = await getAuthState()
  const body = {
    status: 'ok',
    auth,
  }
  return NextResponse.json(body)
}
