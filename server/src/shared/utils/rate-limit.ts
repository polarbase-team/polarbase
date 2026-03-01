const rateLimit = new Map<string, { count: number; reset: number }>();

/**
 * Simple in-memory rate limiter (per IP).
 * Allows max 300 requests per minute.
 */
export const checkRateLimit = (ip: string, limit = 300, prefix = '') => {
  const now = Date.now();
  const key = `${ip}:${prefix}`;

  let rec = rateLimit.get(key);
  if (!rec) {
    rec = { count: 0, reset: now + 60_000 };
  }

  // Reset if over 1 minute
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + 60_000;
  }

  if (rec.count >= limit) {
    return false;
  }

  rec.count++;
  rateLimit.set(key, rec);
  return true;
};
