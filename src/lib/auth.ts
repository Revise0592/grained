export const SESSION_COOKIE = 'grained-auth'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
export const SESSION_TTL_MS = COOKIE_MAX_AGE * 1000

export type SessionTokenPayload = {
  sid: string
  iat: number
  exp: number
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(secret: string, payload: SessionTokenPayload): Promise<string> {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload))
  return `${encodedPayload}.${toBase64Url(new Uint8Array(sig))}`
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionTokenPayload | null> {
  try {
    const [encodedPayload, encodedSig] = token.split('.')
    if (!encodedPayload || !encodedSig) return null

    const key = await hmacKey(secret)
    const bytes = new Uint8Array(Buffer.from(encodedSig, 'base64url'))
    const valid = await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(encodedPayload))
    if (!valid) return null

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<SessionTokenPayload>
    if (
      typeof payload.sid !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }

    if (payload.exp <= Date.now() || payload.iat > payload.exp) {
      return null
    }

    return {
      sid: payload.sid,
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

export function buildSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
}
