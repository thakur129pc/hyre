import mongoose from 'mongoose';

const vehicleSubTypeSchema = new mongoose.Schema(
  {
    subTypeName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleType',
      required: true,
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

// Compound unique index so no same subtype can be added twice under the same type
vehicleSubTypeSchema.index({ typeId: 1, subTypeName: 1 }, { unique: true });

// Basic index for quick searches on subTypeName lookup and status
vehicleSubTypeSchema.index({ subTypeName: 1, status: 1 });

const VehicleSubType = mongoose.model('VehicleSubType', vehicleSubTypeSchema);

export default VehicleSubType;
