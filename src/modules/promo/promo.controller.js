import mongoose from 'mongoose';
import Promo from './promo.model.js';
import City from '../city/city.model.js';
import { AppError } from '../../utils/appError.util.js';
import { logAudit } from '../../utils/auditLogger.util.js';

/**
 * Create a new Promo Code
 */
export const createPromo = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minRideAmount,
      cityId,
      validFrom,
      validUntil,
      usageLimit,
      limitPerUser,
    } = req.body;

    const normalizedCode = code.trim().toUpperCase();

    // Check unique code
    const existingPromo = await Promo.findOne({ code: normalizedCode }).session(session);
    if (existingPromo) {
      throw new AppError('A promo code with this code already exists.', 400);
    }

    // Check city existence if cityId is provided
    if (cityId) {
      const cityExists = await City.findById(cityId).session(session);
      if (!cityExists) {
        throw new AppError('The specified city does not exist.', 400);
      }
    }

    // Create promo
    const newPromoList = await Promo.create(
      [
        {
          code: normalizedCode,
          description,
          discountType,
          discountValue,
          maxDiscountAmount,
          minRideAmount,
          cityId: cityId || null,
          validFrom,
          validUntil,
          usageLimit,
          limitPerUser,
          createdById: req.user ? req.user.id : null,
          createdByModel: req.userType || null,
          updatedById: req.user ? req.user.id : null,
          updatedByModel: req.userType || null,
        },
      ],
      { session }
    );

    const promoResponse = newPromoList[0].toObject();

    // Log CREATE action to central Audit Trail
    await logAudit({
      req,
      action: 'CREATE',
      entityId: promoResponse._id,
      entityType: 'Promo',
      after: promoResponse,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Promo code created successfully.',
      data: promoResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Fetch list of Promo Codes with filters and sorting
 */
export const getPromos = async (req, res, next) => {
  try {
    const { cityId, sortBy, sortOrder = 'asc', page = 1, limit = 20 } = req.body;

    const filter = {};
    if (cityId) {
      // Return both city-specific and global promos
      filter.$or = [{ cityId }, { cityId: null }];
    }

    const query = Promo.find(filter);

    // Apply sorting
    if (sortBy === 'validity') {
      query.sort({ validUntil: sortOrder === 'desc' ? -1 : 1 });
    } else if (sortBy === 'discountValue') {
      query.sort({ discountValue: sortOrder === 'desc' ? -1 : 1 });
    } else {
      query.sort({ createdAt: -1 });
    }

    // Pagination
    const skip = (page - 1) * limit;
    const totalPromos = await Promo.countDocuments(filter);

    const promos = await query
      .skip(skip)
      .limit(limit)
      .populate({ path: 'cityId', select: 'name state' });

    res.status(200).json({
      status: true,
      message: 'Promo codes fetched successfully.',
      data: {
        promos,
        totalPromos,
        page,
        limit,
        totalPages: Math.ceil(totalPromos / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch Promo Code by its string code
 */
export const getPromoByCode = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { code } = req.params;
    const normalizedCode = code.trim().toUpperCase();

    const promo = await Promo.findOne({ code: normalizedCode })
      .populate({ path: 'cityId', select: 'name state' })
      .session(session);

    if (!promo) {
      throw new AppError('Promo code not found.', 404);
    }

    // Auto-inactivate check
    const now = new Date();
    const isExpired = now > promo.validUntil;
    if (isExpired && promo.status === 'active') {
      const beforeState = promo.toObject();
      promo.status = 'inactive';
      promo.updatedById = req.user ? req.user.id : null;
      promo.updatedByModel = req.userType || null;
      await promo.save({ session });

      // Audit status toggle
      await logAudit({
        req,
        action: 'TOGGLE_STATUS',
        entityId: promo._id,
        entityType: 'Promo',
        before: beforeState,
        after: promo.toObject(),
        session,
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Promo code fetched successfully.',
      data: promo,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Toggle Promo Code Status
 */
export const togglePromoStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const promo = await Promo.findById(id).session(session);
    if (!promo) {
      throw new AppError('Promo code not found.', 404);
    }

    const now = new Date();
    const isExpired = now > promo.validUntil;

    let newStatus;
    if (promo.status === 'active') {
      newStatus = 'inactive';
    } else {
      // Trying to activate an inactive promo
      if (isExpired) {
        throw new AppError('Cannot activate an expired promo code.', 400);
      }
      newStatus = 'active';
    }

    const beforeState = promo.toObject();
    promo.status = newStatus;
    promo.updatedById = req.user ? req.user.id : null;
    promo.updatedByModel = req.userType || null;
    await promo.save({ session });

    // Log status toggle audit
    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: promo._id,
      entityType: 'Promo',
      before: beforeState,
      after: promo.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Promo code status toggled successfully to ${newStatus}.`,
      data: { status: newStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Validate and Calculate Promo Discount (Recommended API)
 */
export const validatePromo = async (req, res, next) => {
  try {
    const { code, cityId, rideAmount } = req.body;
    const normalizedCode = code.trim().toUpperCase();

    const promo = await Promo.findOne({ code: normalizedCode });
    if (!promo) {
      return res.status(200).json({
        status: true,
        valid: false,
        reason: 'Promo code does not exist.',
      });
    }

    const now = new Date();

    // 1. Expiration / Active checks
    if (promo.status !== 'active' || now > promo.validUntil) {
      return res.status(200).json({
        status: true,
        valid: false,
        reason: 'Promo code is expired or inactive.',
      });
    }

    // 2. Pre-activation checks
    if (now < promo.validFrom) {
      return res.status(200).json({
        status: true,
        valid: false,
        reason: 'Promo code is not yet valid.',
      });
    }

    // 3. City eligibility check
    if (promo.cityId && promo.cityId.toString() !== cityId) {
      return res.status(200).json({
        status: true,
        valid: false,
        reason: 'Promo code is not valid for this city.',
      });
    }

    // 4. Min ride amount check
    if (rideAmount < promo.minRideAmount) {
      return res.status(200).json({
        status: true,
        valid: false,
        reason: `Minimum ride amount of ${promo.minRideAmount} required to apply this promo.`,
      });
    }

    // 5. Total usage limit check
    if (promo.usageLimit !== undefined && promo.usageCount >= promo.usageLimit) {
      return res.status(200).json({
        status: true,
        valid: false,
        reason: 'Promo code usage limit has been reached.',
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (promo.discountType === 'flat') {
      discountAmount = Math.min(promo.discountValue, rideAmount);
    } else if (promo.discountType === 'percentage') {
      let calculated = rideAmount * (promo.discountValue / 100);
      if (promo.maxDiscountAmount !== undefined) {
        calculated = Math.min(calculated, promo.maxDiscountAmount);
      }
      discountAmount = Math.min(calculated, rideAmount);
    }

    res.status(200).json({
      status: true,
      valid: true,
      data: {
        promoId: promo._id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit Promo Code details (Recommended API)
 */
export const editPromo = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { description, validUntil, usageLimit, limitPerUser, minRideAmount } = req.body;

    const promo = await Promo.findById(id).session(session);
    if (!promo) {
      throw new AppError('Promo code not found.', 404);
    }

    const beforeState = promo.toObject();

    if (description !== undefined) promo.description = description;
    if (validUntil !== undefined) promo.validUntil = validUntil;
    if (usageLimit !== undefined) promo.usageLimit = usageLimit;
    if (limitPerUser !== undefined) promo.limitPerUser = limitPerUser;
    if (minRideAmount !== undefined) promo.minRideAmount = minRideAmount;

    // Check validity rules post-edit
    if (promo.validUntil <= promo.validFrom) {
      throw new AppError('validUntil must be after validFrom date.', 400);
    }

    promo.updatedById = req.user ? req.user.id : null;
    promo.updatedByModel = req.userType || null;

    await promo.save({ session });

    // Log UPDATE audit
    await logAudit({
      req,
      action: 'UPDATE',
      entityId: promo._id,
      entityType: 'Promo',
      before: beforeState,
      after: promo.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Promo code updated successfully.',
      data: promo,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Delete Promo Code (Recommended API)
 */
export const deletePromo = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const promo = await Promo.findById(id).session(session);
    if (!promo) {
      throw new AppError('Promo code not found.', 404);
    }

    const beforeState = promo.toObject();

    await Promo.findByIdAndDelete(id).session(session);

    // Log DELETE audit
    await logAudit({
      req,
      action: 'DELETE',
      entityId: id,
      entityType: 'Promo',
      before: beforeState,
      after: null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Promo code deleted successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Automatically transitions all expired promo codes (validUntil passed) to inactive status.
 * Intended to be run periodically by a background scheduler (cron job).
 */
export const autoExpirePromos = async () => {
  console.log('⏳ Running scheduled promo auto-expiration job...');
  try {
    const now = new Date();
    const result = await Promo.updateMany(
      { status: 'active', validUntil: { $lt: now } },
      { $set: { status: 'inactive' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🟢 Auto-expired ${result.modifiedCount} promo codes.`);
    } else {
      console.log('🟢 No expired promo codes found to deactivate.');
    }
  } catch (error) {
    console.error('🔴 Error running promo auto-expiration job:', error.message);
  }
};
