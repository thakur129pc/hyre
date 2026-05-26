import mongoose from 'mongoose';

const stateSchema = new mongoose.Schema(
  {
    stateName: {
      type: String,
      required: true,
      trim: true,
    },
    stateCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    capital: {
      type: String,
      trim: true,
      default: '',
    },
    timezone: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
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

// Unique compound index: stateCode must be unique within a country
stateSchema.index({ stateCode: 1, country: 1 }, { unique: true });
stateSchema.index({ stateName: 1, country: 1 });
stateSchema.index({ country: 1, status: 1 });
stateSchema.index({ status: 1 });
stateSchema.index({ stateName: 1 });
stateSchema.index({ createdAt: -1 });

const State = mongoose.model('State', stateSchema);

export default State;
