import morgan from 'morgan';
import useragent from 'express-useragent';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import AuthLog from '../../modules/auth/authLog.model.js';

morgan.token('user-details', (req) => {
  if (req.user) {
    return {
      id: req.user.id || req.user._id,
      name: req.user.name,
      role: req.user.role,
      userType: req.userType || null,
    };
  }
  return { status: 'unauthenticated' };
});

morgan.token('timestamp', () => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(Date.now() + istOffset)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', ' IST');
  return istTime;
});

morgan.token('user-agent', (req) => {
  const ua = useragent.parse(req.headers['user-agent'] || '');
  return {
    platform: ua.platform || 'unknown',
    os: ua.os || 'unknown',
    browser: ua.browser || 'unknown',
    device: ua.device || 'unknown',
  };
});

morgan.token('base-url', (req) => `${req.protocol}://${req.get('host')}`);
morgan.token('referrer', (req) => req.get('referrer') || 'none');
morgan.token('req-size', (req) => req.headers['content-length'] || 'unknown');
morgan.token('res-size', (req, res) => res.get('content-length') || 'unknown');
morgan.token('http-version', (req) => req.httpVersion);

// Secure sanitization of logged request body to redact sensitive password credentials
morgan.token('req-body', (req) => {
  if (!req.body || typeof req.body !== 'object') return {};
  const sanitized = { ...req.body };
  const sensitiveKeys = [
    'password',
    'currentPassword',
    'newPassword',
    'oldPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'secret',
  ];

  const redact = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (sensitiveKeys.includes(key)) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redact(obj[key]);
      }
    });
  };

  redact(sanitized);
  return sanitized;
});

morgan.token('res-info', (req, res) => {
  if (res.locals.responseBody) {
    const { status, message } = res.locals.responseBody;
    return { status, message };
  }
  return {};
});

morgan.token('user-id', (req, res) => {
  if (res.locals.responseBody) {
    return res.locals.responseBody?.userId || '';
  }
  return '';
});

morgan.token('user-location', (req) => req.userLocation || {});

export const responseCaptureMiddleware = (req, res, next) => {
  const oldSend = res.send;
  res.send = function (data) {
    try {
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
      const extractedUserId =
        jsonData?.user?._id ||
        jsonData?.data?.user?._id ||
        jsonData?.data?._id ||
        jsonData?.admin?._id ||
        jsonData?.data?.admin?._id ||
        undefined;

      res.locals.responseBody = {
        status: jsonData?.status !== undefined ? jsonData.status : null,
        message: jsonData?.message || null,
        userId: extractedUserId,
      };
    } catch (error) {
      res.locals.responseBody = {};
    }
    return oldSend.apply(res, arguments);
  };
  next();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDirectory = path.join(__dirname, '../../../logs');

if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

const writeLogToFile = (logMessage, isError) => {
  const istDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const [day, month, year] = istDate.split(',')[0].split('/');
  const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // 1. Combined Log (always write)
  const combinedLogFileName = path.join(logsDirectory, `combined-${formattedDate}.log`);
  fs.appendFile(combinedLogFileName, logMessage + '\n', (err) => {
    if (err) console.error('Error writing to combined log file:', err);
  });

  // 2. Error Log (write only if status code indicates client/server error, i.e., 4xx or 5xx)
  if (isError) {
    const errorLogFileName = path.join(logsDirectory, `error-${formattedDate}.log`);
    fs.appendFile(errorLogFileName, logMessage + '\n', (err) => {
      if (err) console.error('Error writing to error log file:', err);
    });
  }
};

export const loggerMiddleware = morgan((tokens, req, res) => {
  const ipAddress =
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    req.ip ||
    tokens['remote-addr'](req, res);

  let logMessage = {
    timestamp: tokens.timestamp(req, res),
    method: tokens.method(req, res),
    httpVersion: tokens['http-version'](req, res),
    baseUrl: tokens['base-url'](req, res),
    url: tokens.url(req, res),
    responseTime: `${tokens['response-time'](req, res)} ms`,
    status: tokens.status(req, res),
    referrer: tokens['referrer'](req, res),
    requestSize: `${tokens['req-size'](req, res)} bytes`,
    responseSize: `${tokens['res-size'](req, res)} bytes`,
    requestBody: tokens['req-body'](req, res),
    responseInfo: tokens['res-info'](req, res),
    ip: ipAddress,
    userDetails: tokens['user-details'](req, res),
    location: tokens['user-location'](req, res),
    userAgent: tokens['user-agent'](req, res),
  };

  const stringifiedLog = JSON.stringify(logMessage);
  const statusCode = parseInt(tokens.status(req, res), 10);
  const isError = statusCode >= 400;
  writeLogToFile(stringifiedLog, isError);
});

const deleteOldLogs = async () => {
  console.log('🔵 Running daily log cleanup......');

  // 1. Database AuthLog cleanup (delete older than 90 days)
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const result = await AuthLog.deleteMany({ performedAt: { $lt: ninetyDaysAgo } });
    console.log(`🟢 Deleted ${result.deletedCount} old auth logs from database.`);
  } catch (err) {
    console.error('🔴 Error cleaning up old auth logs from database:', err.message);
  }

  // 2. File logs cleanup
  const files = fs.readdirSync(logsDirectory);
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const [day, month, year] = now.split(',')[0].split('/');
  const todayIST = new Date(`${year}-${month}-${day}`);

  files.forEach((file) => {
    const match = file.match(/^(combined|error)-(\d{4}-\d{2}-\d{2})\.log$/);
    if (match) {
      const fileDate = new Date(match[2]);
      const diffDays = (todayIST - fileDate) / (1000 * 60 * 60 * 24);

      if (diffDays > 30) {
        const filePath = path.join(logsDirectory, file);
        fs.unlink(filePath, (err) => {
          if (err) console.error(`🔴 Error deleting ${file}:`, err);
          else console.log(`🟢 Deleted old log file: ${file}`);
        });
      }
    }
  });
};

export const deleteLogsCronJobs = () => {
  cron.schedule('0 9 * * *', () => {
    deleteOldLogs();
  });
};
