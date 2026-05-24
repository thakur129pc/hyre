import mongoose from 'mongoose';

const metaDataSchema = new mongoose.Schema(
  {
    ipAddress: String,
    platform: String, // mobile, web
    os: String,
    browser: String,
    device: String,
    baseUrl: String,
    url: String,
    referrer: String,
    // Geo details from user's logger format
    country: String,
    region: String,
    city: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] }, // [longitude, latitude]
    },
  },
  { _id: false }
);

const authLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userType', required: false },
    userType: { type: String, enum: ['Passenger', 'Admin', 'Rider'], required: false },
    action: {
      type: String,
      enum: [
        'login',
        'logout',
        'password_change',
        'password_reset_request',
        'password_reset',
        'failed_attempt',
        'token_refresh',
      ],
      default: 'login',
    },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    failureReason: String,
    attemptedIdentifier: String,
    isNewDevice: { type: Boolean, default: false },
    sessionId: String,
    metadata: metaDataSchema,
  },
  {
    timestamps: { createdAt: 'performedAt', updatedAt: 'updatedAt' },
  }
);

// TTL index to automatically delete logs older than 90 days
authLogSchema.index({ performedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuthLog = mongoose.model('AuthLog', authLogSchema);

export default AuthLog;
