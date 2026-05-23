import express from "express";
import validate from "../../core/middlewares/validate.js";
import {
  authenticateJWT,
  authorizeRoles,
} from "../../core/middlewares/auth.middleware.js";
import {
  createAdminSchema,
  editAdminSchema,
  statusParamSchema,
} from "./admin.validation.js";
import {
  createAdmin,
  editAdmin,
  toggleAdminStatus,
  deleteAdmin,
} from "./admin.controller.js";

const router = express.Router();

// All routes below require a valid JWT token
// router.use(authenticateJWT);

/**
 * @route   POST /api/admins/create
 * @desc    Create a new admin
 * @access  Private (super_admin only)
 */
router.post(
  "/create",
  authorizeRoles("super_admin"),
  validate({ body: createAdminSchema }),
  createAdmin,
);

/**
 * @route   POST /api/admins/edit/:id
 * @desc    Edit an existing admin
 * @access  Private (super_admin only)
 */
router.post(
  "/edit/:id",
  authorizeRoles("super_admin"),
  validate({ params: statusParamSchema, body: editAdminSchema }),
  editAdmin,
);

/**
 * @route   POST /api/admins/toggle-status/:id
 * @desc    Activate or Deactivate an admin
 * @access  Private (super_admin only)
 */
router.post(
  "/toggle-status/:id",
  authorizeRoles("super_admin"),
  validate({ params: statusParamSchema }),
  toggleAdminStatus,
);

/**
 * @route   POST /api/admins/delete/:id
 * @desc    Permanently delete an admin
 * @access  Private (super_admin only)
 */
router.post(
  "/delete/:id",
  authorizeRoles("super_admin"),
  validate({ params: statusParamSchema }),
  deleteAdmin,
);

export default router;
