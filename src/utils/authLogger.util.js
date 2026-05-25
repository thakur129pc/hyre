import useragent from 'express-useragent';
import AuthLog from '../modules/auth/authLog.model.js';

/**
 * Reusable utility to log discrete authentication events (login, logout, failed login, password changes/resets) to MongoDB.
 * Automatically parses browser, OS, platform, IP address, and grabs location metadata.
 *
 * @param {Object} params
 * @param {Object} params.req - Express Request object
 * @param {String} [params.userId] - Optional Mongoose ObjectId of the user (if known/authenticated)
 * @param {String} [params.userType] - User role type (Passenger, Admin, Rider), defaults to Passenger
 * @param {String} params.action - Action performed (login, logout, password_change, password_reset_request, password_reset, failed_attempt, token_refresh)
 * @param {String} [params.status] - Event outcome (success, failure), defaults to success
 * @param {String} [params.failureReason] - Diagnostic reason for failure
 * @param {String} [params.attemptedIdentifier] - The username/email/mobile identifier used for the login attempt (no passwords!)
 * @param {String} [params.sessionId] - Session ID associated with the login
 * @param {Boolean} [params.isNewDevice] - Flag if logging in from a new/unrecognized device, defaults to false
 */
export const logAuthEvent = async ({
  req,
  userId = null,
  userType = 'Passenger',
  action,
  status = 'success',
  failureReason = null,
  attemptedIdentifier = null,
  sessionId = null,
  isNewDevice = false,
}) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';

    const ua = useragent.parse(req.headers['user-agent'] || '');
    const location = req.userLocation || {};

    const metadata = {
      ipAddress,
      platform: ua.platform || 'unknown',
      os: ua.os || 'unknown',
      browser: ua.browser || 'unknown',
      device: ua.device || 'unknown',
      baseUrl: `${req.protocol}://${req.get('host')}`,
      url: req.originalUrl || req.url,
      referrer: req.get('referrer') || 'none',
      country: location.country || 'Unknown',
      region: location.region || 'Unknown',
      city: location.city || 'Unknown',
      location: {
        type: 'Point',
        coordinates: [location.lon || 0, location.lat || 0],
      },
    };

    const logEntry = {
      userId: userId || undefined,
      userType,
      action,
      status,
      failureReason: failureReason || undefined,
      attemptedIdentifier: attemptedIdentifier || undefined,
      isNewDevice,
      sessionId: sessionId || undefined,
      metadata,
    };

    await AuthLog.create(logEntry);
  } catch (err) {
    // Fail silently in production, log error to console for debug
    console.error('🔴 Auth logging failed:', err.message);
  }
};

export default logAuthEvent;
