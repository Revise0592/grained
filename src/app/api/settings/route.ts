import { NextRequest, NextResponse } from 'next/server'
import {
  getLibraryBehaviorSettings,
  updateLibraryBehaviorSettings,
} from '@/lib/settings'

export async function GET() {
  const libraryBehavior = await getLibraryBehaviorSettings()
  return NextResponse.json({ libraryBehavior })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const libraryBehavior = await updateLibraryBehaviorSettings(body?.libraryBehavior)
  return NextResponse.json({ libraryBehavior })
}
