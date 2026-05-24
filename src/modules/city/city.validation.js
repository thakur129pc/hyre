import Joi from 'joi';

export const createCitySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'City name is required.',
    'any.required': 'City name is required.',
  }),
  state: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'State name is required.',
    'any.required': 'State name is required.',
  }),
  status: Joi.string()
    .valid('active', 'inactive', 'coming_soon')
    .optional()
    .default('coming_soon')
    .messages({
      'any.only': 'Status must be active, inactive, or coming_soon.',
    }),
  iconUrl: Joi.string().trim().optional().allow(''),
  servicedPincodes: Joi.array().items(Joi.string().trim()).optional().default([]),
  coordinates: Joi.array().items(Joi.number()).length(2).optional().default([]),
  allowedVehicleTypes: Joi.array().items(Joi.string().hex().length(24)).optional().default([]),
  activeVehicleTypes: Joi.array().items(Joi.string().hex().length(24)).optional().default([]),
  city_config: Joi.object({
    currency: Joi.string().trim().optional().default('INR'),
    timezone: Joi.string().trim().optional().default('Asia/Kolkata'),
    language: Joi.string().trim().optional().default('en'),
    supportContact: Joi.string().trim().allow('').optional().default(''),
    driverSearchRadiusKm: Joi.number().min(0).optional().default(2.5),
    maxRideDistanceKm: Joi.number().min(0).optional().default(50),
  })
    .optional()
    .default({}),
});

export const editCitySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  state: Joi.string().trim().min(2).max(100).optional(),
  iconUrl: Joi.string().trim().optional().allow(''),
  status: Joi.string().valid('active', 'inactive', 'coming_soon').optional().messages({
    'any.only': 'Status must be active, inactive, or coming_soon.',
  }),
  servicedPincodes: Joi.array().items(Joi.string().trim()).optional(),
  coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  allowedVehicleTypes: Joi.array().items(Joi.string().hex().length(24)).optional(),
  activeVehicleTypes: Joi.array().items(Joi.string().hex().length(24)).optional(),
  city_config: Joi.object({
    currency: Joi.string().trim().optional(),
    timezone: Joi.string().trim().optional(),
    language: Joi.string().trim().optional(),
    supportContact: Joi.string().trim().allow('').optional(),
    driverSearchRadiusKm: Joi.number().min(0).optional(),
    maxRideDistanceKm: Joi.number().min(0).optional(),
  }).optional(),
});

export const fetchCitiesSchema = Joi.object({
  state: Joi.string().trim().optional(),
  status: Joi.string().valid('active', 'inactive', 'coming_soon').optional().messages({
    'any.only': 'Status filter must be active, inactive, or coming_soon.',
  }),
});

export const cityParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid City ID format in URL.',
    'string.length': 'Invalid City ID format in URL.',
    'any.required': 'City ID is required in URL.',
  }),
});
