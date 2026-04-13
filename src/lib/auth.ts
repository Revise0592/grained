export const SESSION_COOKIE = 'grained-auth'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const PAYLOAD = 'grained-session-v1'

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(secret: string): Promise<string> {
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(PAYLOAD))
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    const key = await hmacKey(secret)
    const binary = atob(token)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(PAYLOAD))
  } catch {
    return false
  }
}
