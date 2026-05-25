import express from 'express';
import validate from '../../middlewares/validate.middleware.js';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { fetchAuthLogsSchema } from './auth.validation.js';
import { getAuthLogs } from './auth.controller.js';

const router = express.Router();

router.post(
  '/list',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: fetchAuthLogsSchema }),
  getAuthLogs
);

export default router;
