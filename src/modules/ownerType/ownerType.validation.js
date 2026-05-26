import Joi from 'joi';

export const createOwnerTypeSchema = Joi.object({
  title: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Owner type title is required.',
    'any.required': 'Owner type title is required.',
  }),
  status: Joi.string().valid('active', 'inactive').optional().default('active').messages({
    'any.only': 'Status must be active or inactive.',
  }),
});

export const editOwnerTypeSchema = Joi.object({
  title: Joi.string().trim().min(2).max(50).optional(),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be active or inactive.',
  }),
});

export const queryOwnerTypesSchema = Joi.object({
  search: Joi.string().trim().max(100).allow('').optional(),
  status: Joi.string().valid('active', 'inactive', 'all').optional().default('all').messages({
    'any.only': 'Status filter must be active, inactive, or all.',
  }),
  sortBy: Joi.string().valid('title', 'createdAt').optional().default('title'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
});

export const ownerTypeParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Owner Type ID format.',
    'string.length': 'Invalid Owner Type ID format.',
    'any.required': 'Owner Type ID is required.',
  }),
});
