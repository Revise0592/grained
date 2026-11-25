'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, Film, LogOut, BookOpen, Settings, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLink = { href: string; label: string; icon: typeof Plus; match: (p: string) => boolean }

const ROLLS: NavLink = { href: '/', label: 'Rolls', icon: LayoutGrid, match: p => p === '/' || (p.startsWith('/rolls/') && p !== '/rolls/new') }
const IMPORT: NavLink = { href: '/rolls/new', label: 'Import', icon: Plus, match: p => p === '/rolls/new' }
const LIBRARY: NavLink = { href: '/library', label: 'Library', icon: BookOpen, match: p => p === '/library' }
const SETTINGS: NavLink = { href: '/settings', label: 'Settings', icon: Settings, match: p => p === '/settings' }

export function Nav({ authEnabled }: { authEnabled?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname.startsWith('/login')) return null

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Film className="h-5 w-5 text-accent-ink" strokeWidth={1.75} />
            <span className="font-medium tracking-tight text-foreground text-[17px]">Grained</span>
          </Link>

          {/* Desktop words; the current page carries a 2px bar on the header's hairline */}
          <nav aria-label="Main" className="hidden md:flex items-stretch self-stretch gap-6">
            {[ROLLS, LIBRARY, SETTINGS].map(({ href, label, match }) => {
              const current = match(pathname)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center text-[15px] transition-colors focus-visible:outline-none focus-visible:text-foreground focus-visible:underline',
                    'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:transition-transform after:duration-150',
                    current
                      ? 'text-foreground after:bg-accent after:scale-x-100'
                      : 'text-muted-foreground hover:text-foreground after:bg-foreground/40 after:scale-x-0 hover:after:scale-x-100',
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/rolls/new" className="btn btn-primary hidden md:inline-flex">
              <Plus className="h-4 w-4" />
              New roll
            </Link>
            {authEnabled && (
              <button onClick={logout} aria-label="Sign out" title="Sign out" className="btn btn-icon text-muted-foreground hover:text-foreground hover:bg-muted">
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Phone tab bar */}
      <nav aria-label="Main" className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-safe">
        <div className="grid grid-cols-4 h-16">
          {[ROLLS, IMPORT, LIBRARY, SETTINGS].map(({ href, label, icon: Icon, match }) => {
            const current = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-[13px] transition-colors active:bg-muted focus-visible:outline-none focus-visible:bg-muted',
                  current ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-md', current && 'bg-muted')}>
                  <Icon className={cn('h-5 w-5', current && 'text-accent-ink')} strokeWidth={1.75} />
                </span>
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
