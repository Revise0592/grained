'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Film, Lock } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function readErrorMessage(res: Response) {
    const contentType = res.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      try {
        const data = await res.json() as { error?: string }
        if (typeof data.error === 'string' && data.error.trim()) {
          return data.error
        }
      } catch {
        // Fall through to text/status fallback.
      }
    }

    try {
      const text = await res.text()
      if (text.trim()) return text
    } catch {
      // Ignore and fall through to status fallback.
    }

    if (res.status === 401) return 'Incorrect password'
    if (res.status === 429) return 'Too many failed login attempts. Try again later.'
    if (res.status >= 500) return 'Login failed due to a server error.'
    return 'Login failed'
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
        return
      }

      setError(await readErrorMessage(res))
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Film className="h-8 w-8 text-accent-ink mb-4" strokeWidth={1.5} />
          <h1 className="text-2xl font-medium text-foreground tracking-tight">Grained</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your password to continue</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              autoFocus
              className="field sm:h-11 pl-10"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn btn-primary w-full sm:h-11"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link href="/login/reset" className="inline-flex h-11 items-center underline underline-offset-4 hover:text-foreground">
            Reset admin password
          </Link>
        </p>
      </div>
    </div>
  )
}
