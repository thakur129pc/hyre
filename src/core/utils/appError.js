export class AppError extends Error {
  constructor(message, statusCode, action) {
    super(message);
    this.statusCode = statusCode || 500;
    this.action = action || undefined;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
