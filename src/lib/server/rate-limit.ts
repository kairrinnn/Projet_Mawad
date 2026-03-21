type WindowState = {
  count: number;
  resetAt: number;
};

const windowStore = new Map<string, WindowState>();

function now() {
  return Date.now();
}

function pruneExpiredEntries(currentTime: number) {
  for (const [key, value] of windowStore.entries()) {
    if (value.resetAt <= currentTime) {
      windowStore.delete(key);
    }
  }
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const currentTime = now();
  pruneExpiredEntries(currentTime);

  const current = windowStore.get(key);
  if (!current || current.resetAt <= currentTime) {
    const resetAt = currentTime + windowMs;
    windowStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterMs: windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(current.resetAt - currentTime, 0),
    };
  }

  current.count += 1;
  windowStore.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(limit - current.count, 0),
    retryAfterMs: Math.max(current.resetAt - currentTime, 0),
  };
}

export function resetRateLimit(key: string) {
  windowStore.delete(key);
}
