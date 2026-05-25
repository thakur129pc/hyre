import Joi from 'joi';

export const createStateSchema = Joi.object({
  stateName: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'State name is required.',
    'any.required': 'State name is required.',
  }),
  stateCode: Joi.string().trim().min(2).max(10).required().messages({
    'string.empty': 'State code is required (e.g. MH, DL, GJ).',
    'any.required': 'State code is required.',
  }),
  country: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Country name is required.',
    'any.required': 'Country name is required.',
  }),
  countryCode: Joi.string().trim().min(2).max(5).uppercase().allow('').optional().messages({
    'string.max': 'Country code must be at most 5 characters (e.g. IN, US).',
  }),
  capital: Joi.string().trim().max(100).allow('').optional(),
  timezone: Joi.string().trim().max(50).allow('').optional().messages({
    'string.max': 'Timezone must be at most 50 characters (e.g. Asia/Kolkata).',
  }),
  status: Joi.string().valid('active', 'inactive').optional().default('active').messages({
    'any.only': 'Status must be active or inactive.',
  }),
});

export const editStateSchema = Joi.object({
  stateName: Joi.string().trim().min(2).max(100).optional(),
  stateCode: Joi.string().trim().min(2).max(10).optional(),
  country: Joi.string().trim().min(2).max(100).optional(),
  countryCode: Joi.string().trim().min(2).max(5).uppercase().allow('').optional(),
  capital: Joi.string().trim().max(100).allow('').optional(),
  timezone: Joi.string().trim().max(50).allow('').optional(),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be active or inactive.',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to update.',
  });

export const queryStatesSchema = Joi.object({
  search: Joi.string().trim().max(100).allow('').optional(),
  country: Joi.string().trim().max(100).allow('').optional(),
  status: Joi.string().valid('active', 'inactive', 'all').optional().default('all').messages({
    'any.only': 'Status filter must be active, inactive, or all.',
  }),
  sortBy: Joi.string()
    .valid('stateName', 'stateCode', 'country', 'createdAt')
    .optional()
    .default('stateName'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
});

export const getStateByIdentifierSchema = Joi.object({
  stateName: Joi.string().trim().max(100).optional(),
  stateCode: Joi.string().trim().max(10).optional(),
  country: Joi.string().trim().max(100).optional(),
})
  .or('stateName', 'stateCode')
  .messages({
    'object.missing': 'Provide at least stateName or stateCode to lookup a state.',
  });

export const stateParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid State ID format.',
    'string.length': 'Invalid State ID format.',
    'any.required': 'State ID is required.',
  }),
});
