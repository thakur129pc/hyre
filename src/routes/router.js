import express from 'express';
import adminRoutes from '../modules/admin/admin.routes.js';
import passwordRoutes from '../modules/password/password.routes.js';
import vehicleRoutes from '../modules/vehicle/vehicle.routes.js';
import cityRoutes from '../modules/city/city.routes.js';
import priceRoutes from '../modules/price/price.routes.js';
import promoRoutes from '../modules/promo/promo.routes.js';

const router = express.Router();

// Base route: /api/admins
router.use('/admins', adminRoutes);

// Base route: /api/password
router.use('/password', passwordRoutes);

// Base route: /api/vehicles
router.use('/vehicles', vehicleRoutes);

// Base route: /api/cities
router.use('/cities', cityRoutes);

// Base route: /api/prices
router.use('/prices', priceRoutes);

// Base route: /api/promos
router.use('/promos', promoRoutes);

export default router;
