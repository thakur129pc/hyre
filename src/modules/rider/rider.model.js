import mongoose from 'mongoose';

const driverReferralSchema = new mongoose.Schema({
  ownCode: { type: String },
  usedCode: { type: String },
  referredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' }, // Recursive reference
  referralCount: { type: Number, default: 0 },
  totalRewardsEarned: { type: Number, default: 0 }
}, { _id: false });

const riderSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'CityMaster' },
  vehicleTypeId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleMaster' }],
  status: {
    type: String,
    enum: ['pending', 'verified', 'suspended', 'active'],
    default: 'pending'
  },
  languagePreferenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LanguageMaster' },
  referral: driverReferralSchema,
  joinedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date },
  lastKnownLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [longitude, latitude]
  },
  isOnline: {
    type: String,
    enum: ['offline', 'online', 'occupied'],
    default: 'offline'
  },
  activeVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverVehicle' }
}, {
  timestamps: true
});

// Create 2dsphere index for real-time geospatial location queries
riderSchema.index({ lastKnownLocation: '2dsphere' });

// Create compound index for fast driver matching (e.g., find active, online drivers in a specific city)
riderSchema.index({ cityId: 1, isOnline: 1, status: 1 });

const Rider = mongoose.model('Rider', riderSchema);

export default Rider;
