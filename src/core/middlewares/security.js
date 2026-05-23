import helmet from 'helmet';

/**
 * Security middleware using Helmet (actively maintained, Express 5 compatible).
 * Replaces lusca which is unmaintained and not tested against Express 5.
 * Helmet covers: CSP, HSTS, XSS Protection, noSniff, referrerPolicy, and more.
 */
export const securityMiddleware = () => {
  const { HSTS_MAX_AGE } = process.env;

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
      },
    },
    // Strict Transport Security
    hsts: {
      maxAge: parseInt(HSTS_MAX_AGE, 10),
      includeSubDomains: true,
      preload: true,
    },
    // XSS Protection header
    xXssProtection: true,
    // Prevent MIME type sniffing
    noSniff: true,
    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Hide X-Powered-By (belt-and-suspenders alongside app.disable)
    hidePoweredBy: true,
  });
};

/**
 * Additional custom security headers not covered by Helmet
 */
export const customSecurityHeaders = (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};
