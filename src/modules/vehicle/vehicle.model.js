import mongoose from 'mongoose';

const vehicleSpecsSchema = new mongoose.Schema({
  topSpeedPerKm: { type: Number },
  batteryCapacityKwh: { type: Number },
  rangePerChargeKm: { type: Number },
  chargingTimeHours: { type: Number },
}, { _id: false });

const vehicleSchema = new mongoose.Schema({
  vehicleTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleType',
    required: true,
  },
  vehicleSubTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleSubType',
    required: true,
  },
  category: {
    type: String,
    enum: ['passenger', 'delivery'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  numberOfWheels: {
    type: Number,
    required: true,
  },
  maxPassengerCapacity: {
    type: Number,
    required: true,
  },
  iconUrl: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  vehicleSpecs: vehicleSpecsSchema,
}, {
  timestamps: true,
});

// Compound unique index ensuring no same vehicle can be added twice with same vehicleTypeId and vehicleSubTypeId
vehicleSchema.index({ vehicleTypeId: 1, vehicleSubTypeId: 1 }, { unique: true });

// Basic indexes for catalog listing queries
vehicleSchema.index({ category: 1, status: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
