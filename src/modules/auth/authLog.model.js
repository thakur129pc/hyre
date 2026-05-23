import mongoose from 'mongoose';

const metaDataSchema = new mongoose.Schema({
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
    coordinates: { type: [Number] } // [longitude, latitude]
  }
}, { _id: false });

const authLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userType', required: true },
  userType: { type: String, enum: ['Passenger', 'Admin', 'Rider'], required: true },
  action: { 
    type: String, 
    enum: ['login', 'logout', 'password_change', 'failed_attempt', 'token_refresh'],
    default: 'login'
  },
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
  failureReason: String,
  isNewDevice: { type: Boolean, default: false },
  sessionId: String,
  metadata: metaDataSchema,
  history: [mongoose.Schema.Types.Mixed] // Used by the logger.js to push logs incrementally if needed
}, {
  timestamps: { createdAt: 'performedAt', updatedAt: 'updatedAt' }
});

const AuthLog = mongoose.model('AuthLog', authLogSchema);

export default AuthLog;
