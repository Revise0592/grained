import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'

const TEMP_PREFIX = 'grained-'
const CHUNK_PREFIX = 'grained-chunks-'
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000
export const MAX_DIRECT_UPLOAD_BYTES = 800 * 1024 * 1024
export const MAX_LEGACY_CHUNK_BYTES = 10 * 1024 * 1024
export const MAX_LEGACY_CHUNKS = 80
export const MAX_UPLOAD_TEMP_BYTES_PER_JOB = 800 * 1024 * 1024
export const MAX_UPLOAD_TEMP_BYTES_GLOBAL = 2 * 1024 * 1024 * 1024

function getLifecycleTtlMs(overrideMs?: number): number {
  if (overrideMs && Number.isFinite(overrideMs) && overrideMs > 0) return overrideMs

  const raw = process.env.UPLOAD_TEMP_TTL_MS
  if (!raw) return DEFAULT_TTL_MS

  const ttl = Number(raw)
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_MS
}

export function isLegacyChunkUploadEnabled(): boolean {
  const value = process.env.ENABLE_LEGACY_CHUNK_UPLOAD
  return value === '1' || value?.toLowerCase() === 'true'
}

export function createUploadTempPaths(jobId: string) {
  const tempDir = tmpdir()
  return {
    tmpZip: path.join(tempDir, `${TEMP_PREFIX}${jobId}.zip`),
    metaFile: path.join(tempDir, `${TEMP_PREFIX}${jobId}.json`),
  }
}

export function createUploadTempImagePath(jobId: string, index: number, originalName: string) {
  const tempDir = tmpdir()
  const ext = path.extname(originalName).toLowerCase()
  return path.join(tempDir, `${TEMP_PREFIX}${jobId}-img-${String(index).padStart(4, '0')}${ext}`)
}

function isUploadTempArtifact(name: string): boolean {
  if (!name.startsWith(TEMP_PREFIX)) return false
  if (name.endsWith('.zip') || name.endsWith('.json')) return true
  return /-img-\d{4}\.[a-z0-9]+$/i.test(name)
}

function isTrackedTempArtifact(name: string): boolean {
  return isUploadTempArtifact(name) || name.startsWith(CHUNK_PREFIX)
}

async function getArtifactSize(absolutePath: string): Promise<number> {
  const stats = await fs.stat(absolutePath)
  if (stats.isFile()) return stats.size
  if (!stats.isDirectory()) return 0

  const entries = await fs.readdir(absolutePath)
  let total = 0
  for (const name of entries) {
    total += await getArtifactSize(path.join(absolutePath, name))
  }
  return total
}

export async function getTrackedUploadTempUsage() {
  const dir = tmpdir()
  const names = await fs.readdir(dir)
  const tracked = names.filter(isTrackedTempArtifact)

  let bytes = 0
  for (const name of tracked) {
    try {
      bytes += await getArtifactSize(path.join(dir, name))
    } catch {
      // Ignore files that disappear mid-scan.
    }
  }

  return { bytes, count: tracked.length }
}

export async function ensureUploadTempCapacity(additionalBytes = 0) {
  const usage = await getTrackedUploadTempUsage()
  if (usage.bytes + additionalBytes > MAX_UPLOAD_TEMP_BYTES_GLOBAL) {
    throw new Error('Upload temp storage is currently full. Please wait for active uploads to finish and try again.')
  }
  return usage
}

export async function getDirectorySize(absolutePath: string): Promise<number> {
  return getArtifactSize(absolutePath)
}

export async function pruneStaleUploadTempArtifacts(now = Date.now(), ttlMsOverride?: number) {
  const dir = tmpdir()
  const ttlMs = getLifecycleTtlMs(ttlMsOverride)
  const cutoff = now - ttlMs

  const names = await fs.readdir(dir)
  const staleTargets = names.filter(isTrackedTempArtifact)

  const deleted: string[] = []

  for (const name of staleTargets) {
    const absolutePath = path.join(dir, name)

    try {
      const stats = await fs.stat(absolutePath)
      if (stats.mtimeMs > cutoff) {
        continue
      }

      await fs.rm(absolutePath, { recursive: true, force: true })
      deleted.push(name)
    } catch {
      // Best-effort cleanup: ignore races/permission issues.
    }
  }

  return {
    scanned: staleTargets.length,
    deleted,
    ttlMs,
  }
}
