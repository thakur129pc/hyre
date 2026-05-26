import Joi from 'joi';

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
      'Promo',
      'Language',
      'FuelType',
      'OwnerType',
      'AddressType',
      'State'
    )
    .optional(),
});
