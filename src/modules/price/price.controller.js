import mongoose from 'mongoose';
import Price from './price.model.js';
import City from '../city/city.model.js';
import Vehicle from '../vehicle/vehicle.model.js';
import { AppError } from '../../utils/appError.util.js';
import { logAudit } from '../../utils/auditLogger.util.js';

/**
 * Add Price API
 * Restricted to super_admin. Creates a new Price configuration.
 */
export const addPrice = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { cityId, vehicleId, nightFareStartTime, nightFareEndTime, standardFare, nightFare } =
      req.body;

    // Verify referenced City exists
    const cityExists = await City.findById(cityId).session(session);
    if (!cityExists) {
      throw new AppError('The specified City does not exist.', 404);
    }

    // Verify referenced Vehicle exists
    const vehicleExists = await Vehicle.findById(vehicleId).session(session);
    if (!vehicleExists) {
      throw new AppError('The specified Vehicle does not exist.', 404);
    }

    // Guard: Prevent duplicate pricing configuration in the same city for the same vehicle
    const duplicatePrice = await Price.findOne({ cityId, vehicleId }).session(session);
    if (duplicatePrice) {
      throw new AppError(
        'A pricing configuration already exists for this vehicle in the specified city.',
        400
      );
    }

    const newPrice = await Price.create(
      [
        {
          cityId,
          vehicleId,
          nightFareStartTime: nightFareStartTime || '22:00',
          nightFareEndTime: nightFareEndTime || '06:00',
          standardFare,
          nightFare: nightFare || null,
        },
      ],
      { session }
    );

    // Write action to the Polymorphic Audit Trail
    await logAudit({
      req,
      action: 'CREATE',
      entityId: newPrice[0]._id,
      entityType: 'Price',
      after: newPrice[0].toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Pricing configuration added successfully.',
      data: newPrice[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Edit Price API
 * Restricted to super_admin. Updates and merges nested pricing fare structures.
 */
export const editPrice = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { nightFareStartTime, nightFareEndTime, standardFare, nightFare } = req.body;

    const price = await Price.findById(id).session(session);
    if (!price) {
      throw new AppError('Pricing configuration not found.', 404);
    }

    const beforeState = price.toObject();

    // Update timestamps and top-level fields
    if (nightFareStartTime !== undefined) price.nightFareStartTime = nightFareStartTime;
    if (nightFareEndTime !== undefined) price.nightFareEndTime = nightFareEndTime;

    // Perform partial configuration merges on standardFare
    if (standardFare !== undefined) {
      price.standardFare = {
        ...price.standardFare,
        ...standardFare,
      };
    }

    // Perform partial configuration merges on nightFare
    if (nightFare !== undefined) {
      if (nightFare === null) {
        price.nightFare = null;
      } else {
        price.nightFare = price.nightFare
          ? {
              ...price.nightFare,
              ...nightFare,
            }
          : nightFare;
      }
    }

    await price.save({ session });

    // Write action to the Polymorphic Audit Trail
    await logAudit({
      req,
      action: 'UPDATE',
      entityId: price._id,
      entityType: 'Price',
      before: beforeState,
      after: price.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Pricing configuration updated successfully.',
      data: price,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Fetch all allowed vehicles for a city with isPricingAdded flag
 */
export const getCityAllowedVehiclesPricing = async (req, res, next) => {
  try {
    const { cityId } = req.body;

    const city = await City.findById(cityId).populate('allowedVehicles');
    if (!city) {
      throw new AppError('The specified City does not exist.', 404);
    }

    const prices = await Price.find({ cityId });
    const priceMap = new Map();
    prices.forEach((p) => {
      priceMap.set(p.vehicleId.toString(), p._id);
    });

    const data = city.allowedVehicles.map((vehicle) => {
      const vehicleObj = vehicle.toObject();
      const priceId = priceMap.get(vehicle._id.toString()) || null;
      return {
        ...vehicleObj,
        isPricingAdded: !!priceId,
        priceId,
      };
    });

    res.status(200).json({
      status: true,
      message: 'Allowed vehicles pricing status fetched successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch pricing list for all vehicles in a city with vehicle details
 */
export const getCityPrices = async (req, res, next) => {
  try {
    const { cityId } = req.body;

    const cityExists = await City.findById(cityId);
    if (!cityExists) {
      throw new AppError('The specified City does not exist.', 404);
    }

    const prices = await Price.find({ cityId }).populate('vehicleId');

    res.status(200).json({
      status: true,
      message: 'City prices list fetched successfully.',
      data: prices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch single pricing configuration by cityId and vehicleId
 */
export const getPriceByCityAndVehicle = async (req, res, next) => {
  try {
    const { cityId, vehicleId } = req.body;

    const price = await Price.findOne({ cityId, vehicleId }).populate('vehicleId');
    if (!price) {
      throw new AppError(
        'Pricing configuration not found for this vehicle in the specified city.',
        404
      );
    }

    res.status(200).json({
      status: true,
      message: 'Pricing configuration fetched successfully.',
      data: price,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete pricing configuration by ID
 */
export const deletePrice = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const price = await Price.findById(id).session(session);
    if (!price) {
      throw new AppError('Pricing configuration not found.', 404);
    }

    const beforeState = price.toObject();

    await Price.deleteOne({ _id: id }).session(session);

    // Log deletion action to Polymorphic Audit Trail
    await logAudit({
      req,
      action: 'DELETE',
      entityId: id,
      entityType: 'Price',
      before: beforeState,
      after: null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Pricing configuration deleted successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
