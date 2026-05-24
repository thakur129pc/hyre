import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Import middlewares
import { apiRateLimiter, sensitiveApiRateLimiter } from './core/middlewares/limiter.middleware.js';
import errorMiddleware from './core/middlewares/error.middleware.js';
import userInfoMiddleware from './core/middlewares/info.middleware.js';
import {
  loggerMiddleware,
  responseCaptureMiddleware,
  deleteLogsCronJobs,
} from './core/middlewares/logger.middleware.js';
import {
  securityMiddleware,
  customSecurityHeaders,
} from './core/middlewares/security.middleware.js';
import verifyHmac from './core/middlewares/verifyHmac.middleware.js';
import staticFileMiddleware from './core/middlewares/files.middleware.js';
import { sanitizationMiddleware } from './core/middlewares/sanitization.middleware.js';

// Import config and routes
import { scheduleCronJobs } from './config/cron.js';
import routes from './routes/router.js';

dotenv.config({ quiet: true });

const { NODE_ENV, TRUSTED_ORIGINS, SENSITIVE_APIS, TRUST_PROXY_LEVEL, COOKIE_SECRET_KEY } =
  process.env;

const app = express();

// Cookie parser
app.use(
  cookieParser(COOKIE_SECRET_KEY, {
    httpOnly: true,
    secure: 'true',
    sameSite: 'strict',
  })
);

// Block unwanted HTTP Methods
const allowedMethods = ['GET', 'POST', 'OPTIONS'];
app.use((req, res, next) => {
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }
  if (req.method === 'OPTIONS' && !req.headers['access-control-request-method']) {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }
  next();
});

// Cron jobs (global and log deletion)
scheduleCronJobs();
deleteLogsCronJobs();

// CORS Configuration
const allowedOrigins = TRUSTED_ORIGINS ? TRUSTED_ORIGINS.split(',') : [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (NODE_ENV !== 'production') {
        callback(null, origin || '*');
      } else {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['POST', 'GET', 'OPTIONS'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Capture API response and log
app.use(responseCaptureMiddleware);
app.use(loggerMiddleware);

// JSON Denial of Service (DoS) protection
const payloadLimit = process.env.PAYLOAD_LIMIT || '10kb';
app.use(express.json({ limit: payloadLimit }));
app.use(express.urlencoded({ extended: true, limit: payloadLimit }));

// Data Sanitization against NoSQL query injection
// (express-mongo-sanitize mutates req.query which is read-only in Express 5 — manual fix)
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach((key) => {
    if (key.startsWith('$') || key.includes('.') || key.includes('[$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  });
};
app.use((req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  next();
});
app.use(sanitizationMiddleware);

// Custom Security Headers
app.use((req, res, next) => {
  res.removeHeader('Server');
  res.setHeader('Server', 'secure');
  next();
});
app.use(securityMiddleware());
app.use(customSecurityHeaders);
app.disable('x-powered-by');

// Dynamic Trust Proxy (crucial for Rate Limiting behind AWS/Cloudflare)
app.set('trust proxy', parseInt(TRUST_PROXY_LEVEL || '1', 10));

// Rate Limiting
app.use('/api', apiRateLimiter());
const sensitiveApis = SENSITIVE_APIS ? SENSITIVE_APIS.split(',') : [];
sensitiveApis.forEach((api) => {
  app.use(api, sensitiveApiRateLimiter());
});

// HMAC Payload Integrity & Replay Verification
// HMAC Payload Integrity & Replay Verification
app.use((req, res, next) => {
  // Skip static uploads and health check
  if (req.url.startsWith('/uploads') || req.url.includes('/health')) return next();
  // Skip multipart/form-data requests globally (handled locally on routes after Multer parses fields)
  if (req.is('multipart/form-data')) return next();
  // Skip admin and logs utility routes
  if (req.url.includes('/admin') || req.url.includes('/logs')) return next();

  // Default: Require HMAC + Timestamp for other routes
  return verifyHmac(req, res, next);
});

// User IP details middleware
app.use(userInfoMiddleware);

// Serve static files with security headers
app.use('/uploads', staticFileMiddleware());

// Health route
app.get('/api/health', (req, res) => {
  res.json({
    status: true,
    message: 'HYRE Backend API is running securely.',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Setup API routes
app.use('/api/v1', routes);

// 404 Catch all
app.use((req, res, next) => {
  res.status(404).json({ status: false, message: 'Route does not exist.' });
});

// Global Error handler middleware
app.use(errorMiddleware);

export default app;
