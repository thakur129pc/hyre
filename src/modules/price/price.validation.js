import Joi from 'joi';

const additionalChargeSchema = Joi.object({
  chargeName: Joi.string().trim().required(),
  pricePerKm: Joi.number().min(0).required(),
  pricePerMin: Joi.number().min(0).required(),
  perKm: Joi.boolean().required(),
});

const pricingDetailsSchema = Joi.object({
  baseFare: Joi.number().min(0).required(),
  minFare: Joi.number().min(0).required(),
  perKmCharge: Joi.number().min(0).required(),
  perMinCharge: Joi.number().min(0).required(),
  freeWaitTimeMins: Joi.number().integer().min(0).required(),
  waitChargePerMin: Joi.number().min(0).required(),
  freeCancellationTimeMins: Joi.number().integer().min(0).required(),
  cancellationType: Joi.string().valid('flat', 'percentage').required(),
  cancellationCharge: Joi.number()
    .min(0)
    .required()
    .when('cancellationType', {
      is: 'percentage',
      then: Joi.number().max(100).messages({
        'number.max': 'Cancellation charge percentage cannot exceed 100%.',
      }),
    }),
  additionalCharges: Joi.array().items(additionalChargeSchema).optional().default([]),
});

const pricingDetailsEditSchema = Joi.object({
  baseFare: Joi.number().min(0).optional(),
  minFare: Joi.number().min(0).optional(),
  perKmCharge: Joi.number().min(0).optional(),
  perMinCharge: Joi.number().min(0).optional(),
  freeWaitTimeMins: Joi.number().integer().min(0).optional(),
  waitChargePerMin: Joi.number().min(0).optional(),
  freeCancellationTimeMins: Joi.number().integer().min(0).optional(),
  cancellationType: Joi.string().valid('flat', 'percentage').optional(),
  cancellationCharge: Joi.number()
    .min(0)
    .optional()
    .when('cancellationType', {
      is: 'percentage',
      then: Joi.number().max(100).messages({
        'number.max': 'Cancellation charge percentage cannot exceed 100%.',
      }),
    }),
  additionalCharges: Joi.array().items(additionalChargeSchema).optional(),
});

export const addPriceSchema = Joi.object({
  cityId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid City ID format.',
    'string.length': 'Invalid City ID format.',
    'any.required': 'City ID is required.',
  }),
  vehicleId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Vehicle ID format.',
    'string.length': 'Invalid Vehicle ID format.',
    'any.required': 'Vehicle ID is required.',
  }),
  nightFareStartTime: Joi.string()
    .pattern(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Night fare start time must be in HH:MM (24-hour) format.',
    }),
  nightFareEndTime: Joi.string()
    .pattern(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Night fare end time must be in HH:MM (24-hour) format.',
    }),
  standardFare: pricingDetailsSchema.required(),
  nightFare: pricingDetailsSchema.optional().allow(null),
});

export const editPriceSchema = Joi.object({
  nightFareStartTime: Joi.string()
    .pattern(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Night fare start time must be in HH:MM (24-hour) format.',
    }),
  nightFareEndTime: Joi.string()
    .pattern(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Night fare end time must be in HH:MM (24-hour) format.',
    }),
  standardFare: pricingDetailsEditSchema.optional(),
  nightFare: pricingDetailsEditSchema.optional().allow(null),
});

export const priceParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Price ID format.',
    'string.length': 'Invalid Price ID format.',
    'any.required': 'Price ID is required.',
  }),
});

export const cityIdPayloadSchema = Joi.object({
  cityId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid City ID format.',
    'string.length': 'Invalid City ID format.',
    'any.required': 'City ID is required.',
  }),
});

export const getPricePayloadSchema = Joi.object({
  cityId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid City ID format.',
    'string.length': 'Invalid City ID format.',
    'any.required': 'City ID is required.',
  }),
  vehicleId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Vehicle ID format.',
    'string.length': 'Invalid Vehicle ID format.',
    'any.required': 'Vehicle ID is required.',
  }),
});
