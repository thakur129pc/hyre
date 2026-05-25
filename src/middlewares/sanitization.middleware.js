const invalidCharsRegex = /[<>]/;

const exemptedFields = [
  'password',
  'currentPassword',
  'newPassword',
  'oldPassword',
  'confirmPassword',
];

const checkPayload = (obj) => {
  if (typeof obj === 'string') {
    if (invalidCharsRegex.test(obj)) {
      return false;
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (!checkPayload(obj[i])) {
        return false;
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (let key in obj) {
      if (exemptedFields.includes(key)) {
        continue;
      }
      if (!checkPayload(obj[key])) {
        return false;
      }
    }
  }
  return true;
};

export const sanitizationMiddleware = (req, res, next) => {
  try {
    const isBodyValid = checkPayload(req.body);
    const isQueryValid = checkPayload(req.query);
    const isParamsValid = checkPayload(req.params);

    if (!isBodyValid || !isQueryValid || !isParamsValid) {
      return res.status(400).json({
        status: false,
        message: "Invalid input: Characters '<' and '>' are not allowed.",
      });
    }

    next();
  } catch (error) {
    console.error('Sanitization Error:', error);
    return res.status(500).json({
      status: false,
      message: 'Internal Server Error during input validation.',
    });
  }
};
