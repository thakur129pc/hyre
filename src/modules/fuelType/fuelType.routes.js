import express from 'express';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import {
  addFuelType,
  editFuelType,
  toggleFuelTypeStatus,
  deleteFuelType,
  getFuelTypes,
} from './fuelType.controller.js';
import {
  createFuelTypeSchema,
  editFuelTypeSchema,
  queryFuelTypesSchema,
  fuelTypeParamSchema,
} from './fuelType.validation.js';

const router = express.Router();

// Fetch Fuel Types List (Access: Logged-in Admins, Passengers, Riders)
router.post('/list', authenticateJWT, validate({ body: queryFuelTypesSchema }), getFuelTypes);

// Administrative CRUD operations (Access: super_admin only)
router.post(
  '/add',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: createFuelTypeSchema }),
  addFuelType
);

router.post(
  '/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: fuelTypeParamSchema, body: editFuelTypeSchema }),
  editFuelType
);

router.post(
  '/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: fuelTypeParamSchema }),
  toggleFuelTypeStatus
);

router.post(
  '/delete/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: fuelTypeParamSchema }),
  deleteFuelType
);

export default router;
