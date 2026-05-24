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
  description: Joi.string().trim().max(500).optional().allow(''),
  numberOfWheels: Joi.number().integer().min(2).max(10).required().messages({
    'number.base': 'Number of wheels must be a valid number.',
    'any.required': 'Number of wheels is required.',
  }),
  maxPassengerCapacity: Joi.number().integer().min(1).max(100).required().messages({
    'number.base': 'Max passenger capacity must be a valid number.',
    'any.required': 'Max passenger capacity is required.',
  }),
  iconUrl: Joi.string().trim().optional().allow(''),
  vehicleSpecs: Joi.object({
    topSpeedPerKm: Joi.number().min(0).optional(),
    batteryCapacityKwh: Joi.number().min(0).optional(),
    rangePerChargeKm: Joi.number().min(0).optional(),
    chargingTimeHours: Joi.number().min(0).optional(),
  }).optional(),
});

export const fetchSubTypesSchema = Joi.object({
  typeId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Vehicle Type ID format.',
    'string.length': 'Invalid Vehicle Type ID format.',
    'any.required': 'Vehicle Type ID is required.',
  }),
});

export const fetchVehiclesSchema = Joi.object({
  vehicleTypeId: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Invalid Vehicle Type ID format.',
    'string.length': 'Invalid Vehicle Type ID format.',
  }),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be active or inactive.',
  }),
});

export const editVehicleTypeSchema = Joi.object({
  typeName: Joi.string().trim().min(2).max(50).optional(),
});

export const editVehicleSubTypeSchema = Joi.object({
  subTypeName: Joi.string().trim().min(2).max(50).optional(),
});

export const editVehicleSchema = Joi.object({
  vehicleTypeId: Joi.string().hex().length(24).optional(),
  vehicleSubTypeId: Joi.string().hex().length(24).optional(),
  category: Joi.string().valid('passenger', 'delivery').optional(),
  title: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  numberOfWheels: Joi.number().integer().min(2).max(10).optional(),
  maxPassengerCapacity: Joi.number().integer().min(1).max(100).optional(),
  iconUrl: Joi.string().trim().optional().allow(''),
  vehicleSpecs: Joi.object({
    topSpeedPerKm: Joi.number().min(0).optional(),
    batteryCapacityKwh: Joi.number().min(0).optional(),
    rangePerChargeKm: Joi.number().min(0).optional(),
    chargingTimeHours: Joi.number().min(0).optional(),
  }).optional(),
});

export const vehicleParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid ID format in parameter.',
    'string.length': 'Invalid ID format in parameter.',
    'any.required': 'ID is required in parameter.',
  }),
});
