import mongoose from 'mongoose';

const vehicleTypeSchema = new mongoose.Schema({
  typeName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Index for query speed on active status and name lookup
vehicleTypeSchema.index({ typeName: 1, status: 1 });

const VehicleType = mongoose.model('VehicleType', vehicleTypeSchema);

export default VehicleType;
