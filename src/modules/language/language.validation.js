import Joi from 'joi';

export const addLanguageSchema = Joi.object({
  languageCode: Joi.string().trim().lowercase().min(2).max(10).required().messages({
    'string.empty': 'Language code is required.',
    'any.required': 'Language code is required.',
  }),
  languageName: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Language name is required.',
    'any.required': 'Language name is required.',
  }),
  languageNameInEnglish: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Language name in English is required.',
    'any.required': 'Language name in English is required.',
  }),
  isRTL: Joi.boolean().optional().default(false),
  isDefault: Joi.boolean().optional().default(false),
  status: Joi.string().valid('active', 'inactive').optional().default('active'),
  dictionary: Joi.object({
    welcome_text: Joi.string().allow('').optional().default(''),
    login_button: Joi.string().allow('').optional().default(''),
  })
    .unknown(true) // Allows dynamic dictionary keys
    .required()
    .messages({
      'any.required': 'Dictionary is required.',
    }),
});

export const editLanguageSchema = Joi.object({
  languageCode: Joi.string().trim().lowercase().min(2).max(10).optional(),
  languageName: Joi.string().trim().min(2).max(100).optional(),
  languageNameInEnglish: Joi.string().trim().min(2).max(100).optional(),
  isRTL: Joi.boolean().optional(),
  isDefault: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  dictionary: Joi.object({
    welcome_text: Joi.string().allow('').optional(),
    login_button: Joi.string().allow('').optional(),
  })
    .unknown(true)
    .optional(),
});

export const languageParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid Language ID format.',
    'string.length': 'Invalid Language ID format.',
    'any.required': 'Language ID is required.',
  }),
});

export const languageCodeParamSchema = Joi.object({
  code: Joi.string().trim().lowercase().min(2).max(10).required().messages({
    'string.empty': 'Language code parameter is required.',
    'any.required': 'Language code parameter is required.',
  }),
});

export const queryLanguagesSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'all').optional().default('all'),
  sortBy: Joi.string()
    .valid('languageName', 'languageNameInEnglish', 'languageCode')
    .optional()
    .default('languageName'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(200).optional().default(20),
});
