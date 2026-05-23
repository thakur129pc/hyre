import Joi from 'joi';

export const addVehicleTypeSchema = Joi.object({
  typeName: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Vehicle type name is required.',
    'any.required': 'Vehicle type name is required.',
  }),
});

export const addVehicleSubTypeSchema = Joi.object({
  subTypeName: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Vehicle subtype name is required.',
    'any.required': 'Vehicle subtype name is required.',
  }),
  typeId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Vehicle Type ID format.',
    'string.length': 'Invalid Vehicle Type ID format.',
    'any.required': 'Vehicle Type ID is required.',
  }),
});

export const addVehicleSchema = Joi.object({
  vehicleTypeId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Vehicle Type ID format.',
    'string.length': 'Invalid Vehicle Type ID format.',
    'any.required': 'Vehicle Type ID is required.',
  }),
  vehicleSubTypeId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Vehicle Subtype ID format.',
    'string.length': 'Invalid Vehicle Subtype ID format.',
    'any.required': 'Vehicle Subtype ID is required.',
  }),
  category: Joi.string().valid('passenger', 'delivery').required().messages({
    'any.only': 'Category must be either passenger or delivery.',
    'any.required': 'Category is required.',
  }),
  title: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Vehicle title is required.',
    'any.required': 'Vehicle title is required.',
  }),
  description: Joi.string().trim().max(500).optional(),
  numberOfWheels: Joi.number().integer().min(2).max(10).required().messages({
    'number.base': 'Number of wheels must be a valid number.',
    'any.required': 'Number of wheels is required.',
  }),
  maxPassengerCapacity: Joi.number().integer().min(1).max(100).required().messages({
    'number.base': 'Max passenger capacity must be a valid number.',
    'any.required': 'Max passenger capacity is required.',
  }),
  iconUrl: Joi.string().trim().uri().optional().messages({
    'string.uri': 'Icon URL must be a valid URI.',
  }),
  vehicleSpecs: Joi.object({
    topSpeedPerKm: Joi.number().min(0).optional(),
    batteryCapacityKwh: Joi.number().min(0).optional(),
    rangePerChargeKm: Joi.number().min(0).optional(),
    chargingTimeHours: Joi.number().min(0).optional(),
  }).optional(),
});
