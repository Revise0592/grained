import { redirect } from 'next/navigation'
import { getAuthConfig } from '@/lib/auth-config'
import LoginForm from './login-form'

export default function LoginPage() {
  const auth = getAuthConfig()
  if (auth.mode === 'disabled') {
    redirect('/')
  }

  if (auth.mode === 'misconfigured') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="text-xl font-semibold">Authentication is misconfigured</h1>
          <p className="mt-2 text-sm text-muted-foreground">{auth.reason}</p>
        </div>
      </div>
    )
  }

  return <LoginForm />
}
