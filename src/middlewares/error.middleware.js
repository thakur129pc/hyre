import multer from 'multer';

const errorMiddleware = (err, req, res, next) => {
  let message = err.message || 'Internal Server Error';
  let statusCode = err.statusCode || 500;
  let action = err.action || undefined;

  if (err.name === 'CastError') {
    message = `Resource not found. Invalid ${err.path}`;
    statusCode = 400;
  }

  if (err.code === 11000) {
    message = `Duplicate value entered for ${Object.keys(err.keyValue)} field(s).`;
    statusCode = 400;
  }

  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid JSON Web Token. Please try again!';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'JSON Web Token has expired. Please log in again!';
    statusCode = 401;
  }

  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    statusCode = 400;
  }

  if (err.name === 'UnauthorizedError') {
    message = 'Access Denied. Unauthorized user.';
    statusCode = 403;
  }

  if (err.name === 'PermissionError') {
    message = "You don't have permission to perform this action.";
    statusCode = 403;
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    message = 'File size exceeds the limit.';
    statusCode = 400;
  }

  if (err.code === 'INVALID_FILE_FORMAT') {
    message = 'Invalid file format.';
    statusCode = 400;
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    message = 'Invalid JSON. Please check your request payload.';
    statusCode = 400;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file uploaded.';
      statusCode = 400;
    }
  }

  if (err.message === 'CSRF token missing') {
    message = 'CSRF token is missing or invalid.';
    statusCode = 400;
  }

  if (statusCode === 500) {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    status: false,
    message,
    action,
  });
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

export default errorMiddleware;
