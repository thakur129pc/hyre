import Joi from 'joi';

const userTypes = ['Admin', 'Passenger', 'Rider'];

// Regex enforces 8-30 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
const passwordComplexityPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,30}$/;

const passwordMessages = {
  'string.min': 'New password must be at least 8 characters long.',
  'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  'any.required': 'New password is required.'
};

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required.'
  }),
  newPassword: Joi.string()
    .min(8)
    .max(30)
    .pattern(passwordComplexityPattern)
    .required()
    .messages(passwordMessages),
  confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Confirm password must match the new password.',
    'any.required': 'Confirm password is required.'
  })
});

export const forgotPasswordLinkSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please enter a valid email address.',
    'any.required': 'Email is required.'
  }),
  userType: Joi.string().valid(...userTypes).optional().default('Admin').messages({
    'any.only': 'Invalid user type specified.'
  })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required.'
  }),
  newPassword: Joi.string()
    .min(8)
    .max(30)
    .pattern(passwordComplexityPattern)
    .required()
    .messages(passwordMessages),
  confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Confirm password must match the new password.',
    'any.required': 'Confirm password is required.'
  }),
  userType: Joi.string().valid(...userTypes).optional().default('Admin').messages({
    'any.only': 'Invalid user type specified.'
  })
});
