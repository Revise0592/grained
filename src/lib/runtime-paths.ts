const DOCKER_DATABASE_URL = 'file:/data/grained.db'
const DOCKER_UPLOAD_DIR = '/data/uploads'
const LOCAL_DATABASE_URL = 'file:./data/grained.db'
const LOCAL_UPLOAD_DIR = './data/uploads'

function isDevelopmentLike() {
  return process.env.NODE_ENV !== 'production'
}

export function getDatabaseUrl() {
  const configured = process.env.DATABASE_URL?.trim()
  if (!configured) return LOCAL_DATABASE_URL

  if (isDevelopmentLike() && configured === DOCKER_DATABASE_URL) {
    return LOCAL_DATABASE_URL
  }

  return configured
}

export function getUploadDir() {
  const configured = process.env.UPLOAD_DIR?.trim()
  if (!configured) return LOCAL_UPLOAD_DIR

  if (isDevelopmentLike() && configured === DOCKER_UPLOAD_DIR) {
    return LOCAL_UPLOAD_DIR
  }

  return configured
}
