type FailureState = {
  failures: number
  firstFailureAt: number
  lockUntil: number
}

type LoginThrottleStatus =
  | { allowed: true; delayMs: number }
  | { allowed: false; retryAfterSeconds: number }

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const LOCKOUT_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
const BASE_DELAY_MS = 500
const MAX_DELAY_MS = 4_000
// X-Forwarded-For is client-controlled when no proxy rewrites it, so a per-IP limit alone
// can be dodged by rotating the header. A global ceiling caps total guesses regardless.
const GLOBAL_KEY = '__global__'
const GLOBAL_MAX_FAILURES = 50
const MAX_TRACKED_KEYS = 10_000

const failures = new Map<string, FailureState>()

function pruneExpired(now: number) {
  for (const [key, state] of failures) {
    if (state.lockUntil <= now && now - state.firstFailureAt > ATTEMPT_WINDOW_MS) {
      failures.delete(key)
    }
  }
}

function getDelayMs(failureCount: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** Math.max(0, failureCount - 1), MAX_DELAY_MS)
}

export function getThrottleKey(forwardedFor: string | null, realIp: string | null): string {
  const forwarded = forwardedFor?.split(',')[0]?.trim()
  return forwarded || realIp?.trim() || 'unknown'
}

export function getLoginThrottleStatus(key: string, now = Date.now()): LoginThrottleStatus {
  const global = failures.get(GLOBAL_KEY)
  if (global && global.lockUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((global.lockUntil - now) / 1000)) }
  }

  const current = failures.get(key)
  if (!current) return { allowed: true, delayMs: 0 }

  if (current.lockUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.lockUntil - now) / 1000)) }
  }

  if (now - current.firstFailureAt > ATTEMPT_WINDOW_MS) {
    failures.delete(key)
    return { allowed: true, delayMs: 0 }
  }

  return { allowed: true, delayMs: getDelayMs(current.failures) }
}

function bump(key: string, maxFailures: number, now: number) {
  const current = failures.get(key)
  if (!current || now - current.firstFailureAt > ATTEMPT_WINDOW_MS) {
    const next = {
      failures: 1,
      firstFailureAt: now,
      lockUntil: 0,
    }
    failures.set(key, next)
    return next
  }

  current.failures += 1
  if (current.failures >= maxFailures) {
    current.lockUntil = now + LOCKOUT_MS
  }
  failures.set(key, current)
  return current
}

export function recordLoginFailure(key: string, now = Date.now()) {
  if (failures.size >= MAX_TRACKED_KEYS) pruneExpired(now)
  if (failures.size >= MAX_TRACKED_KEYS) {
    const global = failures.get(GLOBAL_KEY)
    failures.clear()
    if (global) failures.set(GLOBAL_KEY, global)
  }

  const global = bump(GLOBAL_KEY, GLOBAL_MAX_FAILURES, now)
  const state = bump(key, MAX_FAILURES, now)
  return global.lockUntil > state.lockUntil ? global : state
}

export function clearLoginFailures(key: string) {
  failures.delete(key)
}
