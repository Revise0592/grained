import fs from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'

const TEMP_PREFIX = 'grained-'
const CHUNK_PREFIX = 'grained-chunks-'
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

function getLifecycleTtlMs(): number {
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

export async function pruneStaleUploadTempArtifacts(now = Date.now()) {
  const dir = tmpdir()
  const ttlMs = getLifecycleTtlMs()
  const cutoff = now - ttlMs

  const names = await fs.readdir(dir)
  const staleTargets = names.filter((name) => {
    const isUploadTempFile =
      name.startsWith(TEMP_PREFIX) &&
      (name.endsWith('.zip') || name.endsWith('.json'))
    const isChunkDir = name.startsWith(CHUNK_PREFIX)
    return isUploadTempFile || isChunkDir
  })

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
