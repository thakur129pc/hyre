import crypto from 'crypto';
import { AppError } from '../utils/appError.util.js';

const safeStringifyValue = (val) => {
  if (val === undefined || val === null) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '';
    }
  }
  try {
    return String(val);
  } catch {
    return '';
  }
};

const formDataToString = (body, files, file) => {
  const entries = [];
  Object.keys(body).forEach((key) => {
    entries.push(`${key}=${safeStringifyValue(body[key])}`);
  });

  if (files) {
    Object.keys(files).forEach((key) => {
      const fileArray = files[key];
      const fieldName = fileArray[0].fieldname;
      fileArray
        .map((file) => file.originalname)
        .forEach((fileName) => {
          entries.push(`${fieldName}=${fileName}`);
        });
    });
  }

  if (file) {
    entries.push(`${file.fieldname}=${file.originalname}`);
  }

  entries.sort((a, b) => a.localeCompare(b));
  return entries.join('&');
};

const verifyHmac = (req, res, next) => {
  const SECRET_KEY = process.env.HMAC_SECRET_KEY;
  const receivedHash = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];

  if (!receivedHash) {
    throw new AppError('Missing HMAC signature (x-signature)', 400);
  }

  // 1. REPLAY ATTACK PROTECTION: Enforce valid timestamp
  if (!timestamp) {
    throw new AppError('Missing timestamp (x-timestamp) for replay protection', 400);
  }

  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  const timeDifference = Math.abs(currentTime - requestTime);

  // Reject requests older than 2 minutes (120000 ms)
  if (timeDifference > 120000) {
    throw new AppError('Request expired. Possible replay attack blocked.', 403);
  }

  try {
    let payloadString = '';

    if (req.is('multipart/form-data')) {
      payloadString = formDataToString(req.body, req.files, req.file);
    } else if (req.body && Object.keys(req.body).length > 0) {
      payloadString = JSON.stringify(req.body);
    }

    // Include the timestamp in the HMAC calculation to strictly tie the signature to this exact moment
    const payloadWithTimestamp = `${payloadString}|${timestamp}`;

    const computedHash = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payloadWithTimestamp)
      .digest('hex');

    // 2. TIMING ATTACK PROTECTION: Enforce strict length and timingSafeEqual
    if (computedHash.length !== receivedHash.length) {
      throw new AppError('Payload integrity check failed! Possible tampering.', 403);
    }

    const computedBuffer = Buffer.from(computedHash, 'utf8');
    const receivedBuffer = Buffer.from(receivedHash, 'utf8');

    if (!crypto.timingSafeEqual(computedBuffer, receivedBuffer)) {
      throw new AppError('Payload integrity check failed! Possible tampering.', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default verifyHmac;
