import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    iconUrl: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'coming_soon'],
      default: 'coming_soon',
    },
    servicedPincodes: {
      type: [String],
      default: [],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [],
    },
    allowedVehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
    ],
    activeVehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
    ],
    city_config: {
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      language: { type: String, default: 'en' },
      supportContact: { type: String, default: '' },
      driverSearchRadiusKm: { type: Number, default: 2.5 },
      maxRideDistanceKm: { type: Number, default: 50 },
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      default: null,
    },
    createdByModel: {
      type: String,
      enum: ['Admin', 'Rider', 'Passenger'],
      default: null,
    },
    updatedById: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'updatedByModel',
      default: null,
    },
    updatedByModel: {
      type: String,
      enum: ['Admin', 'Rider', 'Passenger'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring no duplicate cities in the same state
citySchema.index({ name: 1, state: 1 }, { unique: true });

// Basic index for query filtering
citySchema.index({ state: 1, status: 1 });

const City = mongoose.model('City', citySchema);

export default City;
