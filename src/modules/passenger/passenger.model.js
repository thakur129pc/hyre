import mongoose from 'mongoose';

const passengerReferralSchema = new mongoose.Schema({
  ownCode: { type: String },
  usedCode: { type: String },
  referredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Passenger' },
  referralCount: { type: Number, default: 0 },
  totalRewardsEarned: { type: Number, default: 0 }
}, { _id: false });

const passengerSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  profilePictureUrl: { type: String },
  rating: { type: Number, default: 5.0 },
  status: {
    type: String,
    enum: ['active', 'blocked', 'suspended'],
    default: 'active'
  },
  languagePreferenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LanguageMaster' },
  joinedAt: { type: Date, default: Date.now },
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  referral: passengerReferralSchema
}, {
  timestamps: true
});

// Index for filtering passengers by status
passengerSchema.index({ status: 1 });

const Passenger = mongoose.model('Passenger', passengerSchema);

export default Passenger;
