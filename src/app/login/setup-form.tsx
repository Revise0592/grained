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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Film className="h-10 w-10 text-accent mb-3" />
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Set up Grained</h1>
          <p className="text-sm text-muted-foreground mt-1">Create the admin password for this archive.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full pl-10 pr-4 py-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-2.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating admin…' : 'Create admin password'}
          </button>
        </form>
      </div>
    </div>
  )
}
