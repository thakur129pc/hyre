import express from 'express';
import validate from '../../core/middlewares/validate.js';
import { authenticateJWT, authorizeRoles } from '../../core/middlewares/auth.middleware.js';
import {
  addVehicleTypeSchema,
  addVehicleSubTypeSchema,
  addVehicleSchema,
} from './vehicle.validation.js';
import {
  addVehicleType,
  addVehicleSubType,
  addVehicle,
} from './vehicle.controller.js';

const router = express.Router();

// Securing all catalog editing endpoints with Super Admin authorization
router.use(authenticateJWT);
router.use(authorizeRoles('super_admin'));

/**
 * @route   POST /api/vehicles/type
 * @desc    Add a base Vehicle Type
 * @access  Private (super_admin only)
 */
router.post(
  '/type',
  validate({ body: addVehicleTypeSchema }),
  addVehicleType
);

/**
 * @route   POST /api/vehicles/subtype
 * @desc    Add a Vehicle Sub Type linked to a Type
 * @access  Private (super_admin only)
 */
router.post(
  '/subtype',
  validate({ body: addVehicleSubTypeSchema }),
  addVehicleSubType
);

/**
 * @route   POST /api/vehicles/add
 * @desc    Add a Vehicle to the catalog master
 * @access  Private (super_admin only)
 */
router.post(
  '/add',
  validate({ body: addVehicleSchema }),
  addVehicle
);

export default router;
