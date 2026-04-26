import { redirect } from 'next/navigation'
import LoginForm from './login-form'

// Server component: redirect to home if auth is not configured,
// so Unraid users don't land on a non-functional login screen.
export default function LoginPage() {
  if (!process.env['AUTH_PASSWORD']) {
    redirect('/')
  }
  return <LoginForm />
}
