import express from 'express';
import adminRoutes from '../modules/admin/admin.routes.js';
import passwordRoutes from '../modules/password/password.routes.js';

const router = express.Router();

// Base route: /api/admins
router.use('/admins', adminRoutes);

// Base route: /api/password
router.use('/password', passwordRoutes);

export default router;
