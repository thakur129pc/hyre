import Joi from 'joi';

export const createFuelTypeSchema = Joi.object({
  title: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Fuel type title is required.',
    'any.required': 'Fuel type title is required.',
  }),
  status: Joi.string().valid('active', 'inactive').optional().default('active').messages({
    'any.only': 'Status must be active or inactive.',
  }),
});

export const editFuelTypeSchema = Joi.object({
  title: Joi.string().trim().min(2).max(50).optional(),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be active or inactive.',
  }),
});

export const queryFuelTypesSchema = Joi.object({
  search: Joi.string().trim().max(100).allow('').optional(),
  status: Joi.string().valid('active', 'inactive', 'all').optional().default('all').messages({
    'any.only': 'Status filter must be active, inactive, or all.',
  }),
  sortBy: Joi.string().valid('title', 'createdAt').optional().default('title'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
});

export const fuelTypeParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Fuel Type ID format.',
    'string.length': 'Invalid Fuel Type ID format.',
    'any.required': 'Fuel Type ID is required.',
  }),
});
