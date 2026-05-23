import express from 'express';
import adminRoutes from '../modules/admin/admin.routes.js';

const router = express.Router();

// Base route: /api/admins
router.use('/admins', adminRoutes);

export default router;
