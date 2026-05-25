import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'actorType', // Dynamically reference collection based on actorType field value
    },
    actorType: {
      type: String,
      required: true,
      enum: ['Admin', 'Rider', 'Passenger', 'System'],
    },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'TOGGLE_STATUS',
        'LOGIN',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET',
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityType', // Dynamically reference collection based on entityType field value
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'Admin',
        'City',
        'Vehicle',
        'VehicleType',
        'VehicleSubType',
        'Rider',
        'Passenger',
        'Price',
        'Promo',
        'Language',
        'FuelType',
        'OwnerType',
        'AddressType',
      ],
    },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only need created time for logs
  }
);

// Performance Indexes
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actorType: 1, actorId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
