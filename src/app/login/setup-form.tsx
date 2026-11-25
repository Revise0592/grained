'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Lock } from 'lucide-react'

export default function SetupForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword }),
      })

      const data = await res.json().catch(() => ({} as { error?: string }))
      if (!res.ok) {
        setError(data.error ?? 'Failed to create admin password.')
        return
      }

      router.push('/')
      router.refresh()
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
          <h1 className="text-2xl font-medium text-foreground tracking-tight">Set up Grained</h1>
          <p className="text-sm text-muted-foreground mt-1">Create the admin password for this archive</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
              aria-label="New password"
              autoFocus
              className="field sm:h-11 pl-10"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              aria-label="Confirm password"
              className="field sm:h-11 pl-10"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="btn btn-primary w-full sm:h-11"
          >
            {loading ? 'Creating admin…' : 'Create admin password'}
          </button>
        </form>
      </div>
    </div>
  )
}
