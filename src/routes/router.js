import express from 'express';
import adminRoutes from '../modules/admin/admin.routes.js';
import passwordRoutes from '../modules/password/password.routes.js';
import vehicleRoutes from '../modules/vehicle/vehicle.routes.js';

const router = express.Router();

// Base route: /api/admins
router.use('/admins', adminRoutes);

// Base route: /api/password
router.use('/password', passwordRoutes);

// Base route: /api/vehicles
router.use('/vehicles', vehicleRoutes);

export default router;
