import express from 'express';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import { createUploadMiddleware } from '../../middlewares/upload.middleware.js';
import {
  addAddressType,
  editAddressType,
  toggleAddressTypeStatus,
  deleteAddressType,
  getAddressTypes,
} from './addressType.controller.js';
import {
  createAddressTypeSchema,
  editAddressTypeSchema,
  queryAddressTypesSchema,
  addressTypeParamSchema,
} from './addressType.validation.js';

// Upload middleware configured for address type icons
const { upload, validateUpload } = createUploadMiddleware({
  subFolder: 'addressTypeIcons',
  allowedTypes: {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
  },
  maxSize: 5 * 1024 * 1024, // 5 MB
});

const router = express.Router();

// Fetch Address Types List (Access: Logged-in users)
router.post('/list', authenticateJWT, validate({ body: queryAddressTypesSchema }), getAddressTypes);

// Administrative CRUD operations (Access: super_admin only)
router.post(
  '/add',
  authenticateJWT,
  authorizeRoles('super_admin'),
  upload.single('icon'),
  validateUpload,
  validate({ body: createAddressTypeSchema }),
  addAddressType
);

router.post(
  '/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  upload.single('icon'),
  validateUpload,
  validate({ params: addressTypeParamSchema, body: editAddressTypeSchema }),
  editAddressType
);

router.post(
  '/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: addressTypeParamSchema }),
  toggleAddressTypeStatus
);

router.post(
  '/delete/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: addressTypeParamSchema }),
  deleteAddressType
);

export default router;
