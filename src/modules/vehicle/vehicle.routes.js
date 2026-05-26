import express from 'express';
import validate from '../../middlewares/validate.middleware.js';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { createUploadMiddleware } from '../../middlewares/upload.middleware.js';
import { sanitizationMiddleware } from '../../middlewares/sanitization.middleware.js';
import verifyHmac from '../../middlewares/verifyHmac.middleware.js';

const { upload, validateUpload } = createUploadMiddleware({
  subFolder: 'vehicleCatalogIcons',
  allowedTypes: {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
  },
  maxSize: 5 * 1024 * 1024,
});
import {
  addVehicleTypeSchema,
  addVehicleSubTypeSchema,
  addVehicleSchema,
  fetchVehicleTypesSchema,
  fetchSubTypesSchema,
  fetchVehiclesSchema,
  editVehicleTypeSchema,
  editVehicleSubTypeSchema,
  editVehicleSchema,
  vehicleParamSchema,
} from './vehicle.validation.js';
import {
  addVehicleType,
  addVehicleSubType,
  addVehicle,
  getVehicleTypes,
  getVehicleSubTypes,
  getVehicles,
  editVehicleType,
  toggleVehicleTypeStatus,
  editVehicleSubType,
  toggleVehicleSubTypeStatus,
  editVehicle,
  toggleVehicleStatus,
} from './vehicle.controller.js';

const parseVehicleSpecs = (req, res, next) => {
  if (req.body.vehicleSpecs && typeof req.body.vehicleSpecs === 'string') {
    try {
      req.body.vehicleSpecs = JSON.parse(req.body.vehicleSpecs);
    } catch (err) {
      // Let it remain a string so Joi throws a validation error
    }
  }
  next();
};

const router = express.Router();

// --- PUBLIC/AUTHENTICATED CATALOG QUERIES ---
// (Accessible to any authenticated user type like Passenger/Rider/Admin)
router.post(
  '/get-types',
  authenticateJWT,
  validate({ body: fetchVehicleTypesSchema }),
  getVehicleTypes
);

router.post(
  '/get-subtypes',
  authenticateJWT,
  validate({ body: fetchSubTypesSchema }),
  getVehicleSubTypes
);

router.post('/get-vehicles', authenticateJWT, validate({ body: fetchVehiclesSchema }), getVehicles);

// --- ADMINISTRATIVE CATALOG OPERATIONS ---
// (Restricted strictly to super_admins)

/**
 * @route   POST /api/vehicles/type
 * @desc    Add a base Vehicle Type
 * @access  Private (super_admin only)
 */
router.post(
  '/type',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: addVehicleTypeSchema }),
  addVehicleType
);

/**
 * @route   POST /api/vehicles/type/edit/:id
 * @desc    Edit a base Vehicle Type
 * @access  Private (super_admin only)
 */
router.post(
  '/type/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: vehicleParamSchema, body: editVehicleTypeSchema }),
  editVehicleType
);

/**
 * @route   POST /api/vehicles/type/toggle-status/:id
 * @desc    Toggle status of a base Vehicle Type
 * @access  Private (super_admin only)
 */
router.post(
  '/type/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: vehicleParamSchema }),
  toggleVehicleTypeStatus
);

/**
 * @route   POST /api/vehicles/subtype
 * @desc    Add a Vehicle Sub Type linked to a Type
 * @access  Private (super_admin only)
 */
router.post(
  '/subtype',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: addVehicleSubTypeSchema }),
  addVehicleSubType
);

/**
 * @route   POST /api/vehicles/subtype/edit/:id
 * @desc    Edit a Vehicle Sub Type
 * @access  Private (super_admin only)
 */
router.post(
  '/subtype/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: vehicleParamSchema, body: editVehicleSubTypeSchema }),
  editVehicleSubType
);

/**
 * @route   POST /api/vehicles/subtype/toggle-status/:id
 * @desc    Toggle status of a Vehicle Sub Type
 * @access  Private (super_admin only)
 */
router.post(
  '/subtype/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: vehicleParamSchema }),
  toggleVehicleSubTypeStatus
);

/**
 * @route   POST /api/vehicles/add
 * @desc    Add a Vehicle to the catalog master
 * @access  Private (super_admin only)
 */
router.post(
  '/add',
  authenticateJWT,
  authorizeRoles('super_admin'),
  upload.single('icon'),
  validateUpload,
  verifyHmac,
  parseVehicleSpecs,
  sanitizationMiddleware,
  validate({ body: addVehicleSchema }),
  addVehicle
);

/**
 * @route   POST /api/vehicles/edit/:id
 * @desc    Edit a Vehicle catalog master entry
 * @access  Private (super_admin only)
 */
router.post(
  '/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  upload.single('icon'),
  validateUpload,
  verifyHmac,
  parseVehicleSpecs,
  sanitizationMiddleware,
  validate({ params: vehicleParamSchema, body: editVehicleSchema }),
  editVehicle
);

/**
 * @route   POST /api/vehicles/toggle-status/:id
 * @desc    Toggle status of a Vehicle catalog entry
 * @access  Private (super_admin only)
 */
router.post(
  '/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: vehicleParamSchema }),
  toggleVehicleStatus
);

export default router;
