import fs from 'fs';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import app from './src/app.js';
import { handleServerError } from './src/core/utils/handleServerError.js';
import { AppError } from './src/core/utils/appError.js';

dotenv.config({ quiet: true });

const startServer = async () => {
  const {
    NODE_ENV,
    HTTP_PORT,
    HTTPS_PORT,
    SSL_SERVER_KEY,
    SSL_SERVER_CERT,
  } = process.env;

  try {
    // Connect to Database
    await connectDB();

    if (NODE_ENV === 'production') {
      // Ensure SSL environment variables are available
      if (!SSL_SERVER_KEY || !SSL_SERVER_CERT) {
        throw new AppError(
          'SSL_SERVER_KEY or SSL_SERVER_CERT is not defined in the environment variables.',
          500
        );
      }

      // Read SSL credentials
      const privateKey = fs.readFileSync(SSL_SERVER_KEY, 'utf8');
      const certificate = fs.readFileSync(SSL_SERVER_CERT, 'utf8');
      
      // Enforce strong TLS configurations
      const credentials = { 
        key: privateKey, 
        cert: certificate,
        minVersion: 'TLSv1.2',
        ciphers: [
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-GCM-SHA256',
          'DHE-RSA-AES256-GCM-SHA384',
          'DHE-RSA-AES128-GCM-SHA256',
        ].join(':'),
        honorCipherOrder: true,
      };

      // Start HTTPS server
      const httpsServer = https.createServer(credentials, app);
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`=========================================`);
        console.log(`✅ HTTPS Server is running securely on port ${HTTPS_PORT}`);
        console.log(`=========================================`);
      });

      // Handle server error
      httpsServer.on('error', handleServerError('HTTPS'));

    } else {
      // HTTP server only for local development
      const httpServer = http.createServer(app);
      httpServer.listen(HTTP_PORT, () => {
        console.log(`✅ HTTP Server is running on port ${HTTP_PORT} (Local Development)`);
      });

      httpServer.on('error', handleServerError('HTTP'));
    }
  } catch (err) {
    console.error(`❌ Server initialization failed: ${err.message}`);
    process.exit(1);
  }
};

startServer();
