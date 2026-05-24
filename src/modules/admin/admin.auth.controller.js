import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from './admin.model.js';
import { AppError } from '../../core/utils/appError.util.js';
import { logAudit } from '../../core/utils/auditLogger.util.js';
import { logAuthEvent } from '../../core/utils/authLogger.util.js';

/**
 * Admin Login API
 * Stores accessToken in a secure HTTP-only cookie
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find admin and explicitly select password
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      await logAuthEvent({
        req,
        userType: 'Admin',
        action: 'failed_attempt',
        status: 'failure',
        attemptedIdentifier: email,
        failureReason: 'User not found',
      });
      throw new AppError('Invalid email or password.', 401);
    }

    if (admin.status !== 'active') {
      await logAuthEvent({
        req,
        userId: admin._id,
        userType: 'Admin',
        action: 'failed_attempt',
        status: 'failure',
        attemptedIdentifier: email,
        failureReason: 'Account inactive',
      });
      throw new AppError('Your account is inactive. Please contact support.', 403);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      await logAuthEvent({
        req,
        userId: admin._id,
        userType: 'Admin',
        action: 'failed_attempt',
        status: 'failure',
        attemptedIdentifier: email,
        failureReason: 'Incorrect password',
      });
      throw new AppError('Invalid email or password.', 401);
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: admin._id, role: admin.role, userType: 'Admin' },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Set cookie options
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieMaxAge = parseInt(process.env.JWT_COOKIE_EXPIRES_IN_MS, 10);

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: cookieMaxAge,
    });

    const adminResponse = admin.toObject();
    delete adminResponse.password;

    // Log the successful login event to AuthLog
    await logAuthEvent({
      req,
      userId: admin._id,
      userType: 'Admin',
      action: 'login',
      status: 'success',
    });

    // Log the successful login event to AuditLog
    await logAudit({
      req,
      action: 'LOGIN',
      entityId: admin._id,
      entityType: 'Admin',
      actorId: admin._id,
      actorType: 'Admin',
      after: adminResponse,
    });

    res.status(200).json({
      status: true,
      message: 'Logged in successfully.',
      data: {
        user: adminResponse,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Logout API
 * Clears the accessToken cookie
 */
export const logout = async (req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
    });

    // Log the logout event to AuthLog
    if (req.user) {
      await logAuthEvent({
        req,
        userId: req.user.id,
        userType: req.userType || 'Admin',
        action: 'logout',
        status: 'success',
      });
    }

    // Log the logout event to AuditLog
    await logAudit({
      req,
      action: 'LOGOUT',
      entityId: req.user.id,
      entityType: 'Admin',
    });

    res.status(200).json({
      status: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};
