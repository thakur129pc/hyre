import mongoose from 'mongoose';

const fuelTypeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

// Performance Indexes for search speed and uniqueness lookup
fuelTypeSchema.index({ title: 1, status: 1 });
fuelTypeSchema.index({ status: 1 });
fuelTypeSchema.index({ createdAt: -1 });

const FuelType = mongoose.model('FuelType', fuelTypeSchema);

export default FuelType;
