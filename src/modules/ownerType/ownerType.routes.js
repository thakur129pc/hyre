import express from 'express';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import {
  addOwnerType,
  editOwnerType,
  toggleOwnerTypeStatus,
  deleteOwnerType,
  getOwnerTypes,
} from './ownerType.controller.js';
import {
  createOwnerTypeSchema,
  editOwnerTypeSchema,
  queryOwnerTypesSchema,
  ownerTypeParamSchema,
} from './ownerType.validation.js';

const router = express.Router();

// Fetch Owner Types List (Access: Logged-in Admins, Passengers, Riders)
router.post('/list', authenticateJWT, validate({ body: queryOwnerTypesSchema }), getOwnerTypes);

// Administrative CRUD operations (Access: super_admin only)
router.post(
  '/add',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: createOwnerTypeSchema }),
  addOwnerType
);

router.post(
  '/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: ownerTypeParamSchema, body: editOwnerTypeSchema }),
  editOwnerType
);

router.post(
  '/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: ownerTypeParamSchema }),
  toggleOwnerTypeStatus
);

router.post(
  '/delete/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: ownerTypeParamSchema }),
  deleteOwnerType
);

export default router;
