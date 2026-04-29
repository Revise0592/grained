const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export type AuthConfig = {
  disabled: boolean
  apiKey?: string
}

function normalizeEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isTruthy(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false
}

export function getAuthConfig(): AuthConfig {
  return {
    disabled: isTruthy(process.env['AUTH_DISABLED']),
    apiKey: normalizeEnv(process.env['API_KEY']),
  }
}
