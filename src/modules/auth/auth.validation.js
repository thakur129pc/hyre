import Joi from 'joi';

export const fetchAuthLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(200).optional().default(20),
  startDate: Joi.date().iso().optional().messages({
    'date.format': 'startDate must be a valid ISO 8601 date string.',
  }),
  endDate: Joi.date().iso().optional().messages({
    'date.format': 'endDate must be a valid ISO 8601 date string.',
  }),
  userId: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Invalid User ID format.',
    'string.length': 'Invalid User ID format.',
  }),
  userType: Joi.string().valid('Admin', 'Rider', 'Passenger').optional(),
  action: Joi.string()
    .valid(
      'login',
      'logout',
      'password_change',
      'password_reset_request',
      'password_reset',
      'failed_attempt',
      'token_refresh'
    )
    .optional(),
  status: Joi.string().valid('success', 'failure').optional(),
  ipAddress: Joi.string()
    .ip({ version: ['ipv4', 'ipv6'] })
    .optional()
    .messages({
      'string.ip': 'Must be a valid IP address.',
    }),
});
