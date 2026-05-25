import express from 'express';
import validate from '../../middlewares/validate.middleware.js';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import {
  createPromoSchema,
  queryPromosSchema,
  idParamSchema,
  codeParamSchema,
  validatePromoSchema,
  editPromoSchema,
} from './promo.validation.js';
import {
  createPromo,
  getPromos,
  getPromoByCode,
  togglePromoStatus,
  validatePromo,
  editPromo,
  deletePromo,
} from './promo.controller.js';

const router = express.Router();

// --- Administrative Endpoints (Admins only) ---

router.post(
  '/create',
  authenticateJWT,
  authorizeRoles('super_admin', 'admin'),
  validate({ body: createPromoSchema }),
  createPromo
);

router.post(
  '/list',
  authenticateJWT,
  authorizeRoles('super_admin', 'admin'),
  validate({ body: queryPromosSchema }),
  getPromos
);

router.post(
  '/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin', 'admin'),
  validate({ params: idParamSchema }),
  togglePromoStatus
);

router.post(
  '/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin', 'admin'),
  validate({ params: idParamSchema, body: editPromoSchema }),
  editPromo
);

router.post(
  '/delete/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: idParamSchema }),
  deletePromo
);

// --- Public/Authenticated Endpoints (Admins, Passengers, Riders) ---

router.post('/code/:code', authenticateJWT, validate({ params: codeParamSchema }), getPromoByCode);

router.post('/validate', authenticateJWT, validate({ body: validatePromoSchema }), validatePromo);

export default router;
