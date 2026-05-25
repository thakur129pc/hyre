import { AppError } from '../utils/appError.util.js';

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
      allowUnknown: false, // Disallow extra keys
      stripUnknown: false, // Do not silently strip extra keys
    });

    if (error) {
      error.details.forEach((err) => {
        if (err.type === 'object.unknown') {
          const typeName = key === 'params' ? 'param' : 'payload key';
          errors.push(`"${err.path.join('.')}" is not a valid ${typeName}.`);
        } else {
          errors.push(err.message);
        }
      });
    } else {
      req[key] = value; // Apply parsed values back to request
    }
  });

  if (errors.length > 0) {
    return next(new AppError(errors.join(', '), 400));
  }

  next();
};

export default validate;
