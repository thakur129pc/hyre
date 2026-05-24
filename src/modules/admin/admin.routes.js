import express from 'express';
import validate from '../../core/middlewares/validate.middleware.js';
import { authenticateJWT, authorizeRoles } from '../../core/middlewares/auth.middleware.js';
import { failedLoginLimiter } from '../../core/middlewares/limiter.middleware.js';
import {
  createAdminSchema,
  editAdminSchema,
  statusParamSchema,
  loginSchema,
  fetchLogsSchema,
  fetchAuditLogsSchema,
} from './admin.validation.js';
import {
  createAdmin,
  editAdmin,
  toggleAdminStatus,
  deleteAdmin,
  getCombinedLogs,
  getErrorLogs,
  getAuditLogs,
} from './admin.controller.js';
import { login, logout } from './admin.auth.controller.js';

const router = express.Router();

// All CRUD routes require authentication and authorization
// router.use(authenticateJWT); // Handled on specific routes or globally depending on preference, but here let's keep as is.

/**
 * @route   POST /api/admins/create
 * @desc    Create a new admin
 * @access  Private (super_admin only)
 */
router.post(
  '/create',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: createAdminSchema }),
  createAdmin
);

/**
 * @route   POST /api/admins/edit/:id
 * @desc    Edit an existing admin
 * @access  Private (super_admin only)
 */
router.post(
  '/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: statusParamSchema, body: editAdminSchema }),
  editAdmin
);

/**
 * @route   POST /api/admins/toggle-status/:id
 * @desc    Activate or Deactivate an admin
 * @access  Private (super_admin only)
 */
router.post(
  '/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: statusParamSchema }),
  toggleAdminStatus
);

/**
 * @route   POST /api/admins/delete/:id
 * @desc    Permanently delete an admin
 * @access  Private (super_admin only)
 */
router.post(
  '/delete/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: statusParamSchema }),
  deleteAdmin
);

// --- Admin Authentication Routes ---

/**
 * @route   POST /api/admins/auth/login
 * @desc    Login admin & store accessToken in secure cookie
 * @access  Public
 */
router.post('/auth/login', failedLoginLimiter(), validate({ body: loginSchema }), login);

/**
 * @route   POST /api/admins/auth/logout
 * @desc    Logout admin & clear accessToken cookie
 * @access  Private
 */
router.post('/auth/logout', authenticateJWT, logout);

/**
 * @route   POST /api/admins/logs/combined
 * @desc    Fetch combined logs by date
 * @access  Private (super_admin only)
 */
router.post(
  '/logs/combined',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: fetchLogsSchema }),
  getCombinedLogs
);

/**
 * @route   POST /api/admins/logs/error
 * @desc    Fetch error logs by date
 * @access  Private (super_admin only)
 */
router.post(
  '/logs/error',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: fetchLogsSchema }),
  getErrorLogs
);

/**
 * @route   POST /api/admins/logs/audit
 * @desc    Fetch database audit logs with paging and filters
 * @access  Private (super_admin only)
 */
router.post(
  '/logs/audit',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: fetchAuditLogsSchema }),
  getAuditLogs
);

export default router;
