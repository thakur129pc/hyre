import rateLimit from 'express-rate-limit';

const createRateLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ status: false, message: 'Too many requests.' }),
  });

/**
 * Normal API Rate Limiter
 * 250 requests per 15 minutes (configurable via env, defaults to 250)
 */
export const apiRateLimiter = () => {
  const { API_LIMIT_TIME_SPAN, API_LIMIT } = process.env;
  const windowMs = parseInt(API_LIMIT_TIME_SPAN, 10) || 15 * 60 * 1000; // 15 minutes
  const max = parseInt(API_LIMIT, 10) || 250; // default to 250 requests
  return createRateLimiter(windowMs, max);
};

// In-memory trackers for rolling rate limits
const sensitiveRequests = new Map(); // key: ip, value: { count, blockUntil, firstAttemptAt }
const failedLogins = new Map(); // key: ip, value: { count, blockUntil, firstAttemptAt }

/**
 * Sensitive API Rate Limiter
 * Max 5 tries within 5 minutes, then block for 1 minute
 */
export const sensitiveApiRateLimiter = () => (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const now = Date.now();
  const record = sensitiveRequests.get(ip);

  // Check if blocked
  if (record && record.blockUntil && now < record.blockUntil) {
    const remainingTime = Math.ceil((record.blockUntil - now) / 1000);
    return res.status(429).json({
      status: false,
      message: `Too many attempts on this sensitive API. Please try again after ${remainingTime} seconds.`,
    });
  }

  const currentRecord = sensitiveRequests.get(ip) || { count: 0, firstAttemptAt: now };

  // Reset window if 5 minutes have elapsed since the first attempt in this window
  if (now - currentRecord.firstAttemptAt > 5 * 60 * 1000) {
    currentRecord.count = 0;
    currentRecord.firstAttemptAt = now;
  }

  currentRecord.count += 1;

  if (currentRecord.count > 5) {
    currentRecord.blockUntil = now + 1 * 60 * 1000; // Block for 1 minute
    currentRecord.count = 0; // Reset count for after the block expires
    sensitiveRequests.set(ip, currentRecord);
    return res.status(429).json({
      status: false,
      message: 'Too many attempts on this sensitive API. Please try again after 60 seconds.',
    });
  }

  sensitiveRequests.set(ip, currentRecord);
  next();
};

/**
 * Failed Login attempts Rate Limiter
 * Only allows 5 failed login attempts within 5 minutes, then block for 1 minute.
 * Successfully cleared upon a successful response (status code 200).
 */
export const failedLoginLimiter = () => (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const now = Date.now();
  const record = failedLogins.get(ip);

  // Check if blocked
  if (record && record.blockUntil && now < record.blockUntil) {
    const remainingTime = Math.ceil((record.blockUntil - now) / 1000);
    return res.status(429).json({
      status: false,
      message: `Too many failed login attempts. Please try again after ${remainingTime} seconds.`,
    });
  }

  // Intercept the response to track result
  const oldSend = res.send;
  res.send = function (data) {
    const statusCode = res.statusCode;

    if (statusCode >= 400) {
      // Failed login attempt
      const currentRecord = failedLogins.get(ip) || { count: 0, firstAttemptAt: Date.now() };

      // Reset count if 5 minutes have passed since the first attempt in this window
      if (Date.now() - currentRecord.firstAttemptAt > 5 * 60 * 1000) {
        currentRecord.count = 0;
        currentRecord.firstAttemptAt = Date.now();
      }

      currentRecord.count += 1;

      if (currentRecord.count >= 5) {
        currentRecord.blockUntil = Date.now() + 1 * 60 * 1000; // Block for 1 minute
        currentRecord.count = 0; // Reset count for after the block expires
      }

      failedLogins.set(ip, currentRecord);
    } else if (statusCode === 200) {
      // Successful login, reset tracking
      failedLogins.delete(ip);
    }

    return oldSend.apply(res, arguments);
  };

  next();
};
