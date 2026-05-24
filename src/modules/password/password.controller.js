import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Admin from '../admin/admin.model.js';
import Passenger from '../passenger/passenger.model.js';
import Rider from '../rider/rider.model.js';
import { AppError } from '../../core/utils/appError.util.js';
import sendMail from '../../core/utils/sendMail.util.js';
import { logAudit } from '../../core/utils/auditLogger.util.js';
import { logAuthEvent } from '../../core/utils/authLogger.util.js';

/**
 * Resolves the appropriate Mongoose model based on the userType.
 * @param {string} userType
 * @returns {mongoose.Model|null}
 */
const getModelByUserType = (userType) => {
  switch (userType) {
    case 'Admin':
      return Admin;
    case 'Passenger':
      return Passenger;
    case 'Rider':
      return Rider;
    default:
      return null;
  }
};

/**
 * Validates that the resolved model actually has password fields.
 * Throws a clean 400 validation error if not supported.
 * @param {mongoose.Model} Model
 */
const verifyPasswordSupport = (Model) => {
  if (!Model.schema.paths.password) {
    throw new AppError('This user type does not support password authentication.', 400);
  }
};

/**
 * Change Password API
 * Dynamically resolves model using req.userType attached by JWT auth middleware
 */
export const changePassword = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { currentPassword, newPassword } = req.body;

    const Model = getModelByUserType(req.userType);
    if (!Model) {
      throw new AppError('Invalid user type specified.', 400);
    }

    verifyPasswordSupport(Model);

    const user = await Model.findById(req.user.id).select('+password').session(session);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      await logAuthEvent({
        req,
        userId: user._id,
        userType: req.userType,
        action: 'password_change',
        status: 'failure',
        failureReason: 'Incorrect current password',
      });
      throw new AppError('Incorrect current password.', 400);
    }

    // Prevent setting same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError('New password cannot be the same as the current password.', 400);
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save({ session });

    // Log password change to AuthLog
    await logAuthEvent({
      req,
      userId: user._id,
      userType: req.userType,
      action: 'password_change',
      status: 'success',
    });

    // Log password change action to AuditLog
    await logAudit({
      req,
      action: 'PASSWORD_CHANGE',
      entityId: user._id,
      entityType: req.userType,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Send Forgot Password Link API
 * Dynamically resolves user model using userType in body, defaults to Admin
 */
export const sendForgotPasswordLink = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, userType } = req.body;

    const Model = getModelByUserType(userType);
    if (!Model) {
      throw new AppError('Invalid user type specified.', 400);
    }

    verifyPasswordSupport(Model);

    const user = await Model.findOne({ email }).session(session);
    if (!user) {
      await logAuthEvent({
        req,
        userType,
        action: 'password_reset_request',
        status: 'failure',
        attemptedIdentifier: email,
        failureReason: 'User not found',
      });
      // Security: return generic success to prevent email enumeration
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({
        status: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const tokenValidityMs = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MS, 10);
    const resetExpires = new Date(Date.now() + tokenValidityMs);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetExpires;
    await user.save({ session });

    // Send email link
    const resetUrl = `${process.env.CURRENT_ORIGIN}/forgot-password?token=${resetToken}`;
    const mailSubject = `HYRE - Password Reset Request (${userType})`;
    const mailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333333; text-align: center;">Reset Your Password</h2>
        <p>Hello ${user.fullName || user.name},</p>
        <p>We received a request to reset your password for your HYRE ${userType} account. You can reset your password by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #192a6e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>This link is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777777;">This is an automated email, please do not reply.</p>
      </div>
    `;

    const emailSent = await sendMail(user.email, mailSubject, mailContent);
    if (!emailSent) {
      throw new AppError(
        'There was an error sending the reset email. Please try again later.',
        500
      );
    }

    // Log forgot password request to AuthLog
    await logAuthEvent({
      req,
      userId: user._id,
      userType,
      action: 'password_reset_request',
      status: 'success',
      attemptedIdentifier: email,
    });

    // Log the reset request event to AuditLog
    await logAudit({
      req,
      action: 'PASSWORD_RESET_REQUEST',
      entityId: user._id,
      entityType: userType,
      actorId: user._id,
      actorType: userType,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Reset Password API
 * Dynamically resolves user model using userType in body, defaults to Admin
 */
export const resetPassword = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { token, newPassword, userType } = req.body;

    const Model = getModelByUserType(userType);
    if (!Model) {
      throw new AppError('Invalid user type specified.', 400);
    }

    verifyPasswordSupport(Model);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await Model.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    })
      .select('+password')
      .session(session);

    if (!user) {
      await logAuthEvent({
        req,
        userType,
        action: 'password_reset',
        status: 'failure',
        failureReason: 'Invalid or expired token',
      });
      throw new AppError('Password reset token is invalid or has expired.', 400);
    }

    // Prevent setting same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError('New password cannot be the same as your old password.', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ session });

    // Log successful reset to AuthLog
    await logAuthEvent({
      req,
      userId: user._id,
      userType,
      action: 'password_reset',
      status: 'success',
    });

    // Log the successful password reset event to AuditLog
    await logAudit({
      req,
      action: 'PASSWORD_RESET',
      entityId: user._id,
      entityType: userType,
      actorId: user._id,
      actorType: userType,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
