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
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      level: req.user.level || null,
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
morgan.token('req-body', (req) => req.body || {});

morgan.token('res-info', (req, res) => {
  if (res.locals.responseBody) {
    const { status, message } = res.locals.responseBody;
    return { status, message };
  }
  return '{}';
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
      res.locals.responseBody = {
        status: jsonData?.status !== undefined ? jsonData.status : null,
        message: jsonData?.message || null,
        userId: jsonData?.user?._id || undefined,
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
const logsDirectory = path.join(__dirname, '../../../../logs');

if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

const writeLogToFile = (logMessage) => {
  const istDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const [day, month, year] = istDate.split(',')[0].split('/');
  const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  const logFileName = path.join(logsDirectory, `${formattedDate}.log`);

  fs.appendFile(logFileName, logMessage + '\n', (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
};

export const loggerMiddleware = morgan((tokens, req, res) => {
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
    ip: tokens['remote-addr'](req, res),
    userDetails: tokens['user-details'](req, res),
    location: tokens['user-location'](req, res),
    userAgent: tokens['user-agent'](req, res),
  };

  const stringifiedLog = JSON.stringify(logMessage);
  writeLogToFile(stringifiedLog);

  const userId = tokens['user-id'](req, res);
  if (
    tokens.url(req, res).toLowerCase().includes('login') &&
    tokens.status(req, res) === '200' &&
    userId
  ) {
    const userAgent = useragent.parse(req.headers['user-agent'] || '');
    const location = tokens['user-location'](req, res) || {};
    
    // Determine userType roughly based on URL or req.body, default to Passenger
    let userType = 'Passenger';
    if(req.url.includes('rider') || req.url.includes('driver')) userType = 'Rider';
    if(req.url.includes('admin')) userType = 'Admin';

    const metadata = {
      ipAddress: tokens['remote-addr'](req, res),
      platform: userAgent.platform,
      os: userAgent.os,
      browser: userAgent.browser,
      device: userAgent.device || 'Unknown',
      baseUrl: tokens['base-url'](req, res),
      url: tokens.url(req, res),
      referrer: tokens['referrer'](req, res),
      country: location.country || 'Unknown',
      region: location.region || 'Unknown',
      city: location.city || 'Unknown',
      location: {
        type: 'Point',
        coordinates: [location.lon || 0, location.lat || 0]
      }
    };

    AuthLog.findOneAndUpdate(
      { userId, userType },
      { 
        $setOnInsert: { action: 'login', status: 'success' },
        $set: { metadata },
        $push: { history: { $each: [{ timestamp: new Date(), ip: metadata.ipAddress }], $slice: -100 } } 
      },
      { upsert: true, returnDocument: 'after' }
    ).catch(() => console.error('🔴 Error saving login history. Details omitted for security.'));
  }
});

const deleteOldLogs = () => {
  console.log('🔵 Running daily log cleanup......');
  const files = fs.readdirSync(logsDirectory);
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const [day, month, year] = now.split(',')[0].split('/');
  const todayIST = new Date(`${year}-${month}-${day}`);

  files.forEach((file) => {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.log$/);
    if (match) {
      const fileDate = new Date(match[1]);
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
