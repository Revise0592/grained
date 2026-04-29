import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { prisma } from './db'

const scrypt = promisify(nodeScrypt)

export const SESSION_COOKIE = 'grained-auth'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
export const SESSION_TTL_MS = COOKIE_MAX_AGE * 1000
export const ADMIN_ACCOUNT_ID = 'singleton'
export const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000
const PASSWORD_HASH_BYTES = 64
const MIN_PASSWORD_LENGTH = 10

type CookieRequestLike = {
  headers: {
    get(name: string): string | null
  }
  nextUrl?: {
    protocol?: string
  }
}

function shouldUseSecureCookies(request?: CookieRequestLike) {
  if (process.env.NODE_ENV !== 'production') return false

  const forwardedProto = request?.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  if (forwardedProto) return forwardedProto === 'https'

  const protocol = request?.nextUrl?.protocol?.toLowerCase()
  if (protocol) return protocol === 'https:'

  return false
}

export function buildSessionCookieOptions(request?: CookieRequestLike) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(request),
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
}

export function validatePassword(password: string): string | null {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
  }
  return null
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scrypt(password, salt, PASSWORD_HASH_BYTES) as Buffer
  return {
    passwordSalt: salt,
    passwordHash: hash.toString('hex'),
  }
}

export async function verifyPassword(password: string, passwordSalt: string, passwordHash: string) {
  const derived = await scrypt(password, passwordSalt, PASSWORD_HASH_BYTES) as Buffer
  const expected = Buffer.from(passwordHash, 'hex')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

export function createSessionToken() {
  return randomBytes(24).toString('hex')
}

export function isValidSessionToken(token: string) {
  return /^[a-f0-9]{48}$/.test(token)
}

export async function hasAdminAccount() {
  const admin = await prisma.adminAccount.findUnique({
    where: { id: ADMIN_ACCOUNT_ID },
    select: { id: true },
  })
  return Boolean(admin)
}

export async function createAdminPassword(password: string) {
  const validationError = validatePassword(password)
  if (validationError) {
    throw new Error(validationError)
  }

  const hashed = await hashPassword(password)
  return prisma.adminAccount.create({
    data: {
      id: ADMIN_ACCOUNT_ID,
      ...hashed,
      passwordUpdatedAt: new Date(),
    },
  })
}

export async function updateAdminPassword(password: string) {
  const validationError = validatePassword(password)
  if (validationError) {
    throw new Error(validationError)
  }

  const hashed = await hashPassword(password)
  return prisma.adminAccount.update({
    where: { id: ADMIN_ACCOUNT_ID },
    data: {
      ...hashed,
      passwordUpdatedAt: new Date(),
    },
  })
}

export async function getAdminAccountForAuth() {
  return prisma.adminAccount.findUnique({
    where: { id: ADMIN_ACCOUNT_ID },
    select: {
      id: true,
      passwordSalt: true,
      passwordHash: true,
    },
  })
}

export function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createPasswordResetTokenRecord() {
  const token = randomBytes(24).toString('base64url')
  const tokenHash = hashResetToken(token)
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)

  await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lte: new Date() } },
        { usedAt: { not: null } },
      ],
    },
  })

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      expiresAt,
    },
  })

  return { token, expiresAt }
}
