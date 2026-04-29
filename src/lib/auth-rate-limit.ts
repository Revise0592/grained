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

const failures = new Map<string, FailureState>()

function getDelayMs(failureCount: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** Math.max(0, failureCount - 1), MAX_DELAY_MS)
}

export function getThrottleKey(forwardedFor: string | null, realIp: string | null): string {
  const forwarded = forwardedFor?.split(',')[0]?.trim()
  return forwarded || realIp?.trim() || 'unknown'
}

export function getLoginThrottleStatus(key: string, now = Date.now()): LoginThrottleStatus {
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

export function recordLoginFailure(key: string, now = Date.now()) {
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
  if (current.failures >= MAX_FAILURES) {
    current.lockUntil = now + LOCKOUT_MS
  }
  failures.set(key, current)
  return current
}

export function clearLoginFailures(key: string) {
  failures.delete(key)
}
