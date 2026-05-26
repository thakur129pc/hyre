import express from 'express';
import validate from '../../middlewares/validate.middleware.js';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { createUploadMiddleware } from '../../middlewares/upload.middleware.js';
import verifyHmac from '../../middlewares/verifyHmac.middleware.js';
import { sanitizationMiddleware } from '../../middlewares/sanitization.middleware.js';
import {
  createCitySchema,
  editCitySchema,
  fetchCitiesSchema,
  cityParamSchema,
} from './city.validation.js';
import {
  createCity,
  editCity,
  toggleCityStatus,
  getCities,
  getCityById,
} from './city.controller.js';

const { upload, validateUpload } = createUploadMiddleware({
  subFolder: 'cityIcons',
  allowedTypes: {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
  },
  maxSize: 5 * 1024 * 1024,
});

// Middleware to parse stringified JSON fields from multipart request body
const parseCityMultipartFields = (req, res, next) => {
  const jsonFields = [
    'servicedPincodes',
    'coordinates',
    'allowedVehicles',
    'activeVehicles',
    'city_config',
  ];
  for (const field of jsonFields) {
    if (req.body[field] && typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch {
        // Let it remain a string so Joi validation catches it
      }
    }
  }
  next();
};

const router = express.Router();

// --- PUBLIC/AUTHENTICATED CITY QUERIES ---
// Accessible to any logged in user (Admins, Passenger, Riders)
router.post('/get-cities', authenticateJWT, validate({ body: fetchCitiesSchema }), getCities);

router.post(
  '/get-city-by-id',
  authenticateJWT,
  (req, res, next) => {
    if (req.body.id) {
      req.params.id = req.body.id;
    }
    next();
  },
  validate({ params: cityParamSchema }),
  getCityById
);

// --- ADMINISTRATIVE CITY OPERATIONS ---
// Restricted to super_admin only

router.post(
  '/create',
  authenticateJWT,
  authorizeRoles('super_admin'),
  upload.single('icon'),
  validateUpload,
  verifyHmac,
  parseCityMultipartFields,
  sanitizationMiddleware,
  validate({ body: createCitySchema }),
  createCity
);

router.post(
  '/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  upload.single('icon'),
  validateUpload,
  verifyHmac,
  parseCityMultipartFields,
  sanitizationMiddleware,
  validate({ params: cityParamSchema, body: editCitySchema }),
  editCity
);

router.post(
  '/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: cityParamSchema }),
  toggleCityStatus
);

// Wildcard parameter route defined at the bottom to prevent intercepting other static paths
router.route('/:id').post(authenticateJWT, validate({ params: cityParamSchema }), getCityById);

export default router;
