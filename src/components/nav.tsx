'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, Film, LogOut, BookOpen, Settings } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function Nav({ authEnabled }: { authEnabled?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/login') return null

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Film className="h-5 w-5 text-accent" />
          <span className="font-semibold tracking-tight text-foreground text-base">Grained</span>
        </Link>

{/* Actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/library"
            title="Library"
            className={`p-2 rounded-md transition-colors ${
              pathname === '/library'
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <BookOpen className="h-4 w-4" />
          </Link>

          <Link
            href="/settings"
            title="Settings"
            className={`p-2 rounded-md transition-colors ${
              pathname === '/settings'
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <Link
            href="/rolls/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Roll</span>
          </Link>
          {authEnabled && (
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
