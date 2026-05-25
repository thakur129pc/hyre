import express from 'express';
import validate from '../../middlewares/validate.middleware.js';
import { authenticateJWT } from '../../middlewares/auth.middleware.js';
import {
  changePasswordSchema,
  forgotPasswordLinkSchema,
  resetPasswordSchema,
} from './password.validation.js';
import { changePassword, sendForgotPasswordLink, resetPassword } from './password.controller.js';

const router = express.Router();

/**
 * @route   POST /api/password/change-password
 * @desc    Change password for the currently logged in user
 * @access  Private
 */
router.post(
  '/change-password',
  authenticateJWT,
  validate({ body: changePasswordSchema }),
  changePassword
);

/**
 * @route   POST /api/password/forgot-password-link
 * @desc    Send a reset password link via email
 * @access  Public
 */
router.post(
  '/forgot-password-link',
  validate({ body: forgotPasswordLinkSchema }),
  sendForgotPasswordLink
);

/**
 * @route   POST /api/password/reset-password
 * @desc    Reset password using a verification token
 * @access  Public
 */
router.post('/reset-password', validate({ body: resetPasswordSchema }), resetPassword);

export default router;
