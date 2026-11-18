const DELAYS_MS = [
  30_000,
  2 * 60_000,
  8 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  8 * 60 * 60_000,
  24 * 60 * 60_000,
];

export const STALE_LOCK_MS = 10 * 60_000;
export const WAIT_DELAY_MS = 5 * 60_000;

export function nextAttemptAt(attemptCount: number, now: Date): Date {
  const delay = DELAYS_MS[Math.min(Math.max(attemptCount, 1) - 1, DELAYS_MS.length - 1)] ?? DELAYS_MS[0];
  return new Date(now.getTime() + delay);
}

export function waitUntil(now: Date): Date {
  return new Date(now.getTime() + WAIT_DELAY_MS);
}
