const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export type AuthConfig =
  | { mode: 'disabled'; apiKey?: string }
  | { mode: 'enabled'; password: string; secret: string; apiKey?: string }
  | { mode: 'misconfigured'; reason: string; apiKey?: string }

function normalizeEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isTruthy(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false
}

export function getAuthConfig(): AuthConfig {
  const apiKey = normalizeEnv(process.env['API_KEY'])
  const authDisabled = isTruthy(process.env['AUTH_DISABLED'])
  const password = normalizeEnv(process.env['AUTH_PASSWORD'])
  const secret = normalizeEnv(process.env['SESSION_SECRET'])

  if (authDisabled) {
    return { mode: 'disabled', apiKey }
  }

  if (!password && !secret) {
    return {
      mode: 'misconfigured',
      apiKey,
      reason: 'Authentication is required unless AUTH_DISABLED=true is set explicitly.',
    }
  }

  if (!password || !secret) {
    return {
      mode: 'misconfigured',
      apiKey,
      reason: 'AUTH_PASSWORD and SESSION_SECRET must both be set unless AUTH_DISABLED=true.',
    }
  }

  return { mode: 'enabled', password, secret, apiKey }
}
