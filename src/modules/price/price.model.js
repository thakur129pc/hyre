import mongoose from 'mongoose';

const additionalChargeSchema = new mongoose.Schema(
  {
    chargeName: { type: String, required: true, trim: true },
    pricePerKm: { type: Number, required: true },
    pricePerMin: { type: Number, required: true },
    perKm: { type: Boolean, required: true },
  },
  { _id: false }
);

const pricingDetailsSchema = new mongoose.Schema(
  {
    baseFare: { type: Number, required: true },
    minFare: { type: Number, required: true },
    perKmCharge: { type: Number, required: true },
    perMinCharge: { type: Number, required: true },
    freeWaitTimeMins: { type: Number, required: true },
    waitChargePerMin: { type: Number, required: true },
    freeCancellationTimeMins: { type: Number, required: true },
    cancellationType: {
      type: String,
      enum: ['flat', 'percentage'],
      required: true,
    },
    cancellationCharge: { type: Number, required: true },
    additionalCharges: {
      type: [additionalChargeSchema],
      default: [],
    },
  },
  { _id: false }
);

const priceSchema = new mongoose.Schema(
  {
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    nightFareStartTime: {
      type: String,
      default: '22:00',
    },
    nightFareEndTime: {
      type: String,
      default: '06:00',
    },
    standardFare: {
      type: pricingDetailsSchema,
      required: true,
    },
    nightFare: {
      type: pricingDetailsSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one vehicle has only one price configuration per city
priceSchema.index({ cityId: 1, vehicleId: 1 }, { unique: true });

const Price = mongoose.model('Price', priceSchema);

export default Price;
