import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    status: 'ok',
    auth: process.env['AUTH_PASSWORD'] ? 'enabled' : 'disabled',
  })
}
