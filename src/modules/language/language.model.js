import mongoose from 'mongoose';

const dictionarySchema = new mongoose.Schema(
  {
    welcome_text: { type: String, default: '' },
    login_button: { type: String, default: '' },
  },
  { _id: false, strict: false } // strict: false allows other custom dynamic translation keys
);

const languageSchema = new mongoose.Schema(
  {
    languageCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    languageName: {
      type: String,
      required: true,
      trim: true,
    },
    languageNameInEnglish: {
      type: String,
      required: true,
      trim: true,
    },
    isRTL: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    dictionary: {
      type: dictionarySchema,
      required: true,
      default: () => ({}),
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

// Performance Indexes for search speed
languageSchema.index({ languageCode: 1, status: 1 });
languageSchema.index({ status: 1 });
languageSchema.index({ languageName: 1 });
languageSchema.index({ languageNameInEnglish: 1 });
languageSchema.index({ isDefault: -1, languageName: 1 });
languageSchema.index({ createdAt: -1 });

const Language = mongoose.model('Language', languageSchema);

export default Language;
