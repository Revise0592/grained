import { prisma } from './db'
import { getAuthConfig } from './auth-config'
import { hasAdminAccount } from './auth'

export type AuthState = 'disabled' | 'setup-required' | 'enabled'

export async function getAuthState(): Promise<AuthState> {
  const authConfig = getAuthConfig()
  if (authConfig.disabled) return 'disabled'
  if (!(await hasAdminAccount())) return 'setup-required'
  return 'enabled'
}

export async function revokeAllSessions() {
  await prisma.authSession.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  })
}
