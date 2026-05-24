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

// Helper to extract client IP securely
const getClientIp = (req) => {
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// In-memory trackers for rolling rate limits
const sensitiveRequests = new Map(); // key: ip, value: { count, blockUntil, firstAttemptAt }
const failedLogins = new Map(); // key: ip, value: { count, blockUntil, firstAttemptAt }

/**
 * Sensitive API Rate Limiter
 * Max 5 tries within 5 minutes, then block for 1 minute (configurable)
 */
export const sensitiveApiRateLimiter = () => (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = sensitiveRequests.get(ip);

  const limit = parseInt(process.env.SENSITIVE_API_LIMIT, 10) || 5;
  const timeSpan = parseInt(process.env.SENSITIVE_API_LIMIT_TIME_SPAN, 10) || 5 * 60 * 1000;
  const blockTime = parseInt(process.env.SENSITIVE_API_BLOCK_TIME_SPAN, 10) || 60 * 1000;

  // Check if blocked
  if (record && record.blockUntil) {
    if (now < record.blockUntil) {
      const remainingTime = Math.ceil((record.blockUntil - now) / 1000);
      return res.status(429).json({
        status: false,
        message: `Too many attempts on this sensitive API. Please try again after ${remainingTime} seconds.`,
      });
    } else {
      // Block has expired, clear block status and reset tracking to start fresh
      record.blockUntil = null;
      record.count = 0;
      record.firstAttemptAt = now;
      sensitiveRequests.set(ip, record);
    }
  }

  const currentRecord = sensitiveRequests.get(ip) || { count: 0, firstAttemptAt: now };

  // Reset window if 5 minutes have elapsed since the first attempt in this window
  if (now - currentRecord.firstAttemptAt > timeSpan) {
    currentRecord.count = 0;
    currentRecord.firstAttemptAt = now;
  }

  currentRecord.count += 1;

  if (currentRecord.count > limit) {
    currentRecord.blockUntil = now + blockTime;
    currentRecord.count = 0; // Reset count for after the block expires
    sensitiveRequests.set(ip, currentRecord);

    const remainingTime = Math.ceil(blockTime / 1000);
    return res.status(429).json({
      status: false,
      message: `Too many attempts on this sensitive API. Please try again after ${remainingTime} seconds.`,
    });
  }

  sensitiveRequests.set(ip, currentRecord);
  next();
};

/**
 * Failed Login attempts Rate Limiter
 * Only allows 5 failed login attempts within 5 minutes, then block for 1 minute (configurable).
 * Successfully cleared upon a successful response (status code 200).
 */
export const failedLoginLimiter = () => (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = failedLogins.get(ip);

  const limit = parseInt(process.env.ALLOWED_FAILED_LOGIN_ATTEMPTS, 10) || 5;
  const timeSpan = parseInt(process.env.FAILED_LOGIN_LIMIT_TIME_SPAN, 10) || 5 * 60 * 1000;
  const blockTime = parseInt(process.env.FAILED_LOGIN_BLOCK_TIME_SPAN, 10) || 60 * 1000;

  // Check if blocked
  if (record && record.blockUntil) {
    if (now < record.blockUntil) {
      const remainingTime = Math.ceil((record.blockUntil - now) / 1000);
      return res.status(429).json({
        status: false,
        message: `Too many failed login attempts. Please try again after ${remainingTime} seconds.`,
      });
    } else {
      // Block has expired, clear block status and reset tracking to start fresh
      record.blockUntil = null;
      record.count = 0;
      record.firstAttemptAt = now;
      failedLogins.set(ip, record);
    }
  }

  // Intercept the response to track result
  const oldSend = res.send;
  res.send = function (data) {
    const statusCode = res.statusCode;

    if (statusCode >= 400) {
      // Failed login attempt
      const currentRecord = failedLogins.get(ip) || { count: 0, firstAttemptAt: Date.now() };

      // Reset count if 5 minutes have passed since the first attempt in this window
      if (Date.now() - currentRecord.firstAttemptAt > timeSpan) {
        currentRecord.count = 0;
        currentRecord.firstAttemptAt = Date.now();
      }

      currentRecord.count += 1;

      if (currentRecord.count >= limit) {
        currentRecord.blockUntil = Date.now() + blockTime;
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
