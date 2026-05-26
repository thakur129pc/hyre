import Joi from 'joi';

export const createPromoSchema = Joi.object({
  code: Joi.string()
    .uppercase()
    .regex(/^[A-Z0-9]{3,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Promo code must be 3-15 alphanumeric characters in uppercase.',
      'any.required': 'Promo code is required.',
    }),
  description: Joi.string().max(255).optional(),
  discountType: Joi.string().valid('percentage', 'flat').required().messages({
    'any.only': 'Discount type must be either percentage or flat.',
    'any.required': 'Discount type is required.',
  }),
  discountValue: Joi.number().positive().required().messages({
    'number.positive': 'Discount value must be a positive number.',
    'any.required': 'Discount value is required.',
  }),
  maxDiscountAmount: Joi.number().positive().optional().messages({
    'number.positive': 'Max discount amount must be a positive number.',
  }),
  minRideAmount: Joi.number().min(0).optional().messages({
    'number.min': 'Minimum ride amount cannot be negative.',
  }),
  cityId: Joi.string().hex().length(24).allow(null).optional().messages({
    'string.hex': 'Invalid city ID format.',
    'string.length': 'Invalid city ID format.',
  }),
  validFrom: Joi.date().iso().required().messages({
    'date.format': 'validFrom must be a valid ISO date.',
    'any.required': 'validFrom date is required.',
  }),
  validUntil: Joi.date().iso().greater(Joi.ref('validFrom')).required().messages({
    'date.format': 'validUntil must be a valid ISO date.',
    'date.greater': 'validUntil must be after validFrom date.',
    'any.required': 'validUntil date is required.',
  }),
  usageLimit: Joi.number().integer().positive().optional().messages({
    'number.base': 'Usage limit must be a number.',
    'number.positive': 'Usage limit must be a positive integer.',
  }),
  limitPerUser: Joi.number().integer().positive().optional().messages({
    'number.base': 'Limit per user must be a number.',
    'number.positive': 'Limit per user must be a positive integer.',
  }),
});

export const queryPromosSchema = Joi.object({
  search: Joi.string().trim().max(50).allow('').optional(),
  cityId: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Invalid City ID format.',
    'string.length': 'Invalid City ID format.',
  }),
  status: Joi.string().valid('active', 'inactive', 'all').optional().default('all').messages({
    'any.only': 'Status filter must be active, inactive, or all.',
  }),
  discountType: Joi.string().valid('flat', 'percentage', 'all').optional().default('all').messages({
    'any.only': 'Discount type filter must be flat, percentage, or all.',
  }),
  validFrom: Joi.date().iso().optional().messages({
    'date.format': 'validFrom must be a valid ISO date.',
  }),
  validUntil: Joi.date().iso().optional().messages({
    'date.format': 'validUntil must be a valid ISO date.',
  }),
  sortBy: Joi.string()
    .valid('validity', 'discountValue', 'code', 'createdAt')
    .optional()
    .default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
});

export const validatePromoSchema = Joi.object({
  code: Joi.string().uppercase().required().messages({
    'any.required': 'Promo code is required.',
  }),
  cityId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid City ID format.',
    'string.length': 'Invalid City ID format.',
    'any.required': 'City ID is required.',
  }),
  rideAmount: Joi.number().positive().required().messages({
    'number.positive': 'Ride amount must be a positive number.',
    'any.required': 'Ride amount is required.',
  }),
});

export const editPromoSchema = Joi.object({
  description: Joi.string().max(255).optional(),
  validUntil: Joi.date().iso().optional().messages({
    'date.format': 'validUntil must be a valid ISO date.',
  }),
  usageLimit: Joi.number().integer().positive().optional().messages({
    'number.positive': 'Usage limit must be a positive integer.',
  }),
  limitPerUser: Joi.number().integer().positive().optional().messages({
    'number.positive': 'Limit per user must be a positive integer.',
  }),
  minRideAmount: Joi.number().min(0).optional().messages({
    'number.min': 'Minimum ride amount cannot be negative.',
  }),
});

export const idParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid ID format in URL.',
    'string.length': 'Invalid ID format in URL.',
    'any.required': 'ID parameter is required.',
  }),
});

export const codeParamSchema = Joi.object({
  code: Joi.string()
    .uppercase()
    .regex(/^[A-Z0-9]{3,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Promo code must be 3-15 alphanumeric characters in uppercase.',
      'any.required': 'Code parameter is required.',
    }),
});
