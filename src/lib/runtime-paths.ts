import path from 'path'

const DOCKER_DATABASE_URL = 'file:/data/grained.db'
const DOCKER_UPLOAD_DIR = '/data/uploads'
const LOCAL_DATABASE_URL = 'file:./data/grained.db'
const LOCAL_UPLOAD_DIR = './data/uploads'

function isDevelopmentLike() {
  return process.env.NODE_ENV !== 'production'
}

// Prisma resolves relative SQLite paths against the prisma/ folder, not the project root,
// so `file:./data/grained.db` would point at prisma/data/. Anchor them to the working directory.
function absolutizeSqliteUrl(url: string) {
  if (!url.startsWith('file:')) return url
  const filePath = url.slice('file:'.length)
  if (path.isAbsolute(filePath)) return url
  return `file:${path.resolve(process.cwd(), filePath)}`
}

export function getDatabaseUrl() {
  const configured = process.env.DATABASE_URL?.trim()
  if (!configured) return absolutizeSqliteUrl(LOCAL_DATABASE_URL)

  if (isDevelopmentLike() && configured === DOCKER_DATABASE_URL) {
    return absolutizeSqliteUrl(LOCAL_DATABASE_URL)
  }

  return absolutizeSqliteUrl(configured)
}

export function getUploadDir() {
  const configured = process.env.UPLOAD_DIR?.trim()
  if (!configured) return LOCAL_UPLOAD_DIR

  if (isDevelopmentLike() && configured === DOCKER_UPLOAD_DIR) {
    return LOCAL_UPLOAD_DIR
  }

  return configured
}
