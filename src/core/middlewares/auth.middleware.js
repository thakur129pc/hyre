import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';
import Admin from '../../modules/admin/admin.model.js';

/**
 * Middleware to verify JWT token and attach user to req.user
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AppError('You are not logged in. Please provide a token.', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Verify if user still exists and is active
    let user;
    if (decoded.userType === 'Admin') {
      user = await Admin.findById(decoded.id);
    }
    // Add logic for Passenger and Rider later if they use this middleware

    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('Your account has been deactivated or blocked.', 403);
    }

    // Attach user to request
    req.user = user;
    req.userType = decoded.userType; // 'Admin', 'Passenger', 'Rider'
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Dynamic RBAC Middleware to strictly enforce roles
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // If not logged in or missing user
    if (!req.user || !req.user.role) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    // Defence-in-depth: Ensure user account is still active at the point of action
    if (req.user.status !== 'active') {
      return next(new AppError('Your account is inactive. Please contact support.', 403));
    }

    // Check if user's role is in the allowed array
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Role '${req.user.role}' is not authorized to access this route.`, 403));
    }

    next();
  };
};
