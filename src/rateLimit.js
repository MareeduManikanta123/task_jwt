const WINDOW_MS = 60 * 1000;
const LIMIT = 5;

function createLoginRateLimiter() {
  const state = new Map();

  function getEntry(ip) {
    const now = Date.now();
    const existing = state.get(ip);
    if (!existing || now > existing.resetAt) {
      const entry = { count: 0, resetAt: now + WINDOW_MS };
      state.set(ip, entry);
      return entry;
    }
    return existing;
  }

  function isBlocked(ip) {
    const entry = state.get(ip);
    return entry && entry.count >= LIMIT && Date.now() < entry.resetAt;
  }

  function getRetryAfterSeconds(ip) {
    const entry = getEntry(ip);
    const seconds = Math.ceil((entry.resetAt - Date.now()) / 1000);
    return Math.max(0, seconds);
  }

  function recordFailure(ip) {
    const entry = getEntry(ip);
    entry.count += 1;
    return entry.count;
  }

  function reset(ip) {
    state.delete(ip);
  }

  return function loginRateLimiter(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (isBlocked(ip)) {
      const retryAfter = getRetryAfterSeconds(ip);
      res.set("Retry-After", String(retryAfter));
      res.set("X-RateLimit-Limit", String(LIMIT));
      res.set("X-RateLimit-Remaining", "0");
      return res.status(429).json({
        error: "rate_limited",
        message: "Too many login attempts. Try again later.",
      });
    }

    req.rateLimit = {
      ip,
      recordFailure,
      reset,
      limit: LIMIT,
    };

    return next();
  };
}

module.exports = createLoginRateLimiter;
