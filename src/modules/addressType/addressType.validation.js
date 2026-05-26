import Joi from 'joi';

export const createAddressTypeSchema = Joi.object({
  title: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Address type title is required.',
    'any.required': 'Address type title is required.',
  }),
  status: Joi.string().valid('active', 'inactive').optional().default('active').messages({
    'any.only': 'Status must be active or inactive.',
  }),
});

export const editAddressTypeSchema = Joi.object({
  title: Joi.string().trim().min(2).max(50).optional(),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be active or inactive.',
  }),
});

export const queryAddressTypesSchema = Joi.object({
  search: Joi.string().trim().max(100).allow('').optional(),
  status: Joi.string().valid('active', 'inactive', 'all').optional().default('all').messages({
    'any.only': 'Status filter must be active, inactive, or all.',
  }),
  sortBy: Joi.string().valid('title', 'createdAt').optional().default('title'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
});

export const addressTypeParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Address Type ID format in URL.',
    'string.length': 'Invalid Address Type ID format in URL.',
    'any.required': 'Address Type ID is required in URL.',
  }),
});
