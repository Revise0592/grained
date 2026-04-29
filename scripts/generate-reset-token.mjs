import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'

const prisma = new PrismaClient()

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000

async function main() {
  const admin = await prisma.adminAccount.findUnique({
    where: { id: 'singleton' },
    select: { id: true },
  })

  if (!admin) {
    throw new Error('Admin account has not been created yet. Open /login and complete first-run setup first.')
  }

  const token = randomBytes(24).toString('base64url')
  const tokenHash = hashResetToken(token)
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)

  await prisma.passwordResetToken.deleteMany({
    where: {},
  })

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      expiresAt,
    },
  })

  console.log('Grained password reset token')
  console.log(`Token: ${token}`)
  console.log(`Expires: ${expiresAt.toISOString()}`)
  console.log('Open /login/reset and use this token to set a new admin password.')
}

try {
  await main()
} finally {
  await prisma.$disconnect()
}
