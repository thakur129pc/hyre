import express from 'express';
import validate from '../../middlewares/validate.middleware.js';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { fetchAuditLogsSchema } from './audit.validation.js';
import { getAuditLogs } from './audit.controller.js';

const router = express.Router();

router.post(
  '/list',
  authenticateJWT,
  authorizeRoles('super_admin'),
  validate({ body: fetchAuditLogsSchema }),
  getAuditLogs
);

export default router;
