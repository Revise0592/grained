import { redirect } from 'next/navigation'
import { getAuthState } from '@/lib/auth-state'
import ResetForm from './reset-form'

export default async function ResetPage() {
  const authState = await getAuthState()
  if (authState === 'disabled') {
    redirect('/')
  }
  if (authState === 'setup-required') {
    redirect('/login')
  }

  return <ResetForm />
}
