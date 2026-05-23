import { AppError } from '../utils/appError.js';

/**
 * Validates request payload against Joi schemas.
 * @param {Object} schema - Object containing Joi schemas for body, query, and/or params.
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = Object.keys(schema).reduce((acc, key) => {
    if (['body', 'query', 'params'].includes(key)) {
      acc[key] = schema[key];
    }
    return acc;
  }, {});

  const errors = [];
  
  Object.keys(validSchema).forEach((key) => {
    const { error, value } = validSchema[key].validate(req[key], {
      abortEarly: false,
      stripUnknown: true, // Remove unknown keys
    });

    if (error) {
      error.details.forEach((err) => errors.push(err.message));
    } else {
      req[key] = value; // Apply parsed/stripped values back to request
    }
  });

  if (errors.length > 0) {
    return next(new AppError(errors.join(', '), 400));
  }

  next();
};

export default validate;
