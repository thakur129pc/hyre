import express from 'express';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import {
  addState,
  editState,
  toggleStateStatus,
  deleteState,
  getStates,
  getStateByIdentifier,
} from './state.controller.js';
import {
  createStateSchema,
  editStateSchema,
  queryStatesSchema,
  getStateByIdentifierSchema,
  stateParamSchema,
} from './state.validation.js';

const router = express.Router();

// ── Public/Authenticated Queries ───────────────────────────────────────────────

// List states with search, filters, sorting, pagination
router.post('/list', authenticateJWT, validate({ body: queryStatesSchema }), getStates);

// Fetch single state by stateName or stateCode (+ optional country)
router.post(
  '/get-by-identifier',
  authenticateJWT,
  validate({ body: getStateByIdentifierSchema }),
  getStateByIdentifier
);

// ── Administrative Operations (super_admin only) ───────────────────────────────

router.post(
  '/add',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: createStateSchema }),
  addState
);

router.post(
  '/edit/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: stateParamSchema, body: editStateSchema }),
  editState
);

router.post(
  '/toggle-status/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: stateParamSchema }),
  toggleStateStatus
);

router.post(
  '/delete/:id',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ params: stateParamSchema }),
  deleteState
);

export default router;
