import rateLimit from 'express-rate-limit';

const createRateLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ status: false, message: 'Too many requests.' }),
  });

export const apiRateLimiter = () => {
  const { API_LIMIT_TIME_SPAN, API_LIMIT } = process.env;
  const windowMs = parseInt(API_LIMIT_TIME_SPAN, 10);
  const max = parseInt(API_LIMIT, 10);
  return createRateLimiter(windowMs, max);
};

export const sensitiveApiRateLimiter = () => {
  const { SENSITIVE_API_LIMIT_TIME_SPAN, SENSITIVE_API_LIMIT } = process.env;
  const windowMs = parseInt(SENSITIVE_API_LIMIT_TIME_SPAN, 10);
  const max = parseInt(SENSITIVE_API_LIMIT, 10);
  return createRateLimiter(windowMs, max);
};
