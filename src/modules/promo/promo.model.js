import mongoose from 'mongoose';

const promoSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    maxDiscountAmount: {
      type: Number,
    },
    minRideAmount: {
      type: Number,
      default: 0,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      default: null,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    limitPerUser: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

promoSchema.index({ cityId: 1 });
promoSchema.index({ validUntil: 1 });

const Promo = mongoose.model('Promo', promoSchema);

export default Promo;
