import express from 'express';
import validate from '../../middlewares/validate.middleware.js';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import {
  addPriceSchema,
  editPriceSchema,
  priceParamSchema,
  cityIdPayloadSchema,
  getPricePayloadSchema,
} from './price.validation.js';
import {
  addPrice,
  editPrice,
  getCityAllowedVehiclesPricing,
  getCityPrices,
  getPriceByCityAndVehicle,
  deletePrice,
} from './price.controller.js';

const router = express.Router();

// All price endpoints require JWT authentication
router.use(authenticateJWT);

// --- QUERY ENDPOINTS ---
// Accessible to any logged in user (Admins, Passengers, Riders)
router.post(
  '/city-allowed-vehicles',
  validate({ body: cityIdPayloadSchema }),
  getCityAllowedVehiclesPricing
);

router.post('/city-prices', validate({ body: cityIdPayloadSchema }), getCityPrices);

router.post('/get-price', validate({ body: getPricePayloadSchema }), getPriceByCityAndVehicle);

// --- ADMINISTRATIVE WRITE ENDPOINTS ---
// Restricted to super_admin only
router.use(authorizeRoles('super_admin'));

/**
 * @route   POST /api/v1/prices/add
 * @desc    Add a pricing configuration
 * @access  Private (super_admin only)
 */
router.post('/add', validate({ body: addPriceSchema }), addPrice);

/**
 * @route   POST /api/v1/prices/edit/:id
 * @desc    Edit an existing pricing configuration
 * @access  Private (super_admin only)
 */
router.post('/edit/:id', validate({ params: priceParamSchema, body: editPriceSchema }), editPrice);

/**
 * @route   POST /api/v1/prices/delete/:id
 * @desc    Delete a pricing configuration
 * @access  Private (super_admin only)
 */
router.post('/delete/:id', validate({ params: priceParamSchema }), deletePrice);

export default router;
