import Joi from 'joi';

export const createAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .min(8)
    .max(30)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,30}$/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long.',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be between 10 and 15 digits.',
    }),
  role: Joi.string().valid('super_admin', 'finance', 'support', 'city_manager').required(),
  assignedCityIds: Joi.array()
    .items(Joi.string().hex().length(24).message('Invalid City ID format'))
    .when('role', {
      is: 'super_admin',
      then: Joi.array().optional().default([]),
      otherwise: Joi.array().min(1).required().messages({
        'array.min': 'Non-super admins must be assigned to at least one city.',
      }),
    }),
});

export const editAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .optional(),
  assignedCityIds: Joi.array()
    .items(Joi.string().hex().length(24).message('Invalid City ID format'))
    .optional(),
});

export const statusParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Admin ID format.',
    'string.length': 'Invalid Admin ID format.',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please enter a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required.',
  }),
});

export const fetchLogsSchema = Joi.object({
  date: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Date must be in YYYY-MM-DD format.',
      'any.required': 'Date is required.',
      'string.empty': 'Date is required.',
    }),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(500).optional().default(100),
});

export const fetchAuditLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(200).optional().default(20),
  startDate: Joi.date().iso().optional().messages({
    'date.format': 'startDate must be a valid ISO 8601 date string.',
  }),
  endDate: Joi.date().iso().optional().messages({
    'date.format': 'endDate must be a valid ISO 8601 date string.',
  }),
  actorId: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Invalid Actor ID format.',
    'string.length': 'Invalid Actor ID format.',
  }),
  actorType: Joi.string().valid('Admin', 'Rider', 'Passenger', 'System').optional(),
  action: Joi.string()
    .valid(
      'CREATE',
      'UPDATE',
      'DELETE',
      'TOGGLE_STATUS',
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET_REQUEST',
      'PASSWORD_RESET'
    )
    .optional(),
  entityId: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Invalid Entity ID format.',
    'string.length': 'Invalid Entity ID format.',
  }),
  entityType: Joi.string()
    .valid(
      'Admin',
      'City',
      'Vehicle',
      'VehicleType',
      'VehicleSubType',
      'Rider',
      'Passenger',
      'Price',
      'Promo'
    )
    .optional(),
});
