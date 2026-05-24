import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const staticFileMiddleware = (publicDir = 'public/uploads') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Resolve correctly from src/core/middlewares
  const resolvedPath = join(__dirname, '../../../', publicDir);

  return express.static(join(resolvedPath), {
    setHeaders: (res) => {
      // Content Security Policy for static files
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Disable caching for sensitive files
      res.setHeader('Cache-Control', 'no-store');
    },
  });
};

export default staticFileMiddleware;
