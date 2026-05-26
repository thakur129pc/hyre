import mongoose from 'mongoose';
import FuelType from './fuelType.model.js';
import { AppError } from '../../utils/appError.util.js';
import { logAudit } from '../../utils/auditLogger.util.js';

// Helper to escape special characters in regex queries to prevent RegExp injection
const escapeRegex = (string) => {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * Add Fuel Type
 * Restricted to super_admin. Creates a new fuel type configuration.
 */
export const addFuelType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { title, status } = req.body;
    const normalizedTitle = title.trim();

    // Case-insensitive check for duplicate
    const existing = await FuelType.findOne({
      title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
    }).session(session);

    if (existing) {
      throw new AppError(`Fuel type '${normalizedTitle}' already exists.`, 400);
    }

    const newFuelList = await FuelType.create(
      [
        {
          title: normalizedTitle,
          status: status || 'active',
          createdById: req.user ? req.user.id : null,
          createdByModel: req.userType || null,
          updatedById: req.user ? req.user.id : null,
          updatedByModel: req.userType || null,
        },
      ],
      { session }
    );

    const fuelTypeResponse = newFuelList[0].toObject();

    await logAudit({
      req,
      action: 'CREATE',
      entityId: fuelTypeResponse._id,
      entityType: 'FuelType',
      after: fuelTypeResponse,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Fuel type added successfully.',
      data: fuelTypeResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Edit Fuel Type
 * Restricted to super_admin. Updates a fuel type configuration.
 */
export const editFuelType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { title, status } = req.body;

    const fuelType = await FuelType.findById(id).session(session);
    if (!fuelType) {
      throw new AppError('Fuel type not found.', 404);
    }

    const beforeState = fuelType.toObject();

    if (title !== undefined) {
      const normalizedTitle = title.trim();
      if (normalizedTitle.toLowerCase() !== fuelType.title.toLowerCase()) {
        // Verify uniqueness
        const duplicate = await FuelType.findOne({
          title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
          _id: { $ne: id },
        }).session(session);

        if (duplicate) {
          throw new AppError(`Fuel type '${title}' already exists.`, 400);
        }
      }
      fuelType.title = normalizedTitle;
    }

    if (status !== undefined) {
      fuelType.status = status;
    }

    fuelType.updatedById = req.user ? req.user.id : null;
    fuelType.updatedByModel = req.userType || null;

    await fuelType.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: fuelType._id,
      entityType: 'FuelType',
      before: beforeState,
      after: fuelType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Fuel type updated successfully.',
      data: fuelType,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Toggle Fuel Type Status
 * Restricted to super_admin. Toggles active/inactive.
 */
export const toggleFuelTypeStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const fuelType = await FuelType.findById(id).session(session);
    if (!fuelType) {
      throw new AppError('Fuel type not found.', 404);
    }

    const beforeState = fuelType.toObject();
    const nextStatus = fuelType.status === 'active' ? 'inactive' : 'active';
    fuelType.status = nextStatus;

    fuelType.updatedById = req.user ? req.user.id : null;
    fuelType.updatedByModel = req.userType || null;

    await fuelType.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: fuelType._id,
      entityType: 'FuelType',
      before: beforeState,
      after: fuelType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Fuel type status updated successfully to ${nextStatus}.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Delete Fuel Type
 * Restricted to super_admin. Deletes a fuel type.
 */
export const deleteFuelType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const fuelType = await FuelType.findById(id).session(session);
    if (!fuelType) {
      throw new AppError('Fuel type not found.', 404);
    }

    const beforeState = fuelType.toObject();

    await FuelType.deleteOne({ _id: id }).session(session);

    await logAudit({
      req,
      action: 'DELETE',
      entityId: id,
      entityType: 'FuelType',
      before: beforeState,
      after: null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Fuel type deleted successfully.',
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Get Fuel Types
 * Accessible to authenticated users. Supports search, pagination, filters, and sorting.
 */
export const getFuelTypes = async (req, res, next) => {
  try {
    const {
      search = '',
      status = 'all',
      sortBy = 'title',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = req.body;

    const filter = {};

    // Security check: non-admins are restricted to active fuel types
    if (req.userType !== 'Admin') {
      filter.status = 'active';
    } else {
      if (status && status !== 'all') {
        filter.status = status;
      }
    }

    // Search by title
    if (search && search.trim()) {
      filter.title = {
        $regex: new RegExp(search.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'),
      };
    }

    // Sorting
    const sortCriteria = {};
    sortCriteria[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;

    const [totalElements, fuelTypes] = await Promise.all([
      FuelType.countDocuments(filter),
      FuelType.find(filter).sort(sortCriteria).skip(skip).limit(limit),
    ]);

    res.status(200).json({
      status: true,
      message: 'Fuel types fetched successfully.',
      data: {
        fuelTypes,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalElements / limit),
        limitPerPage: limit,
        totalElements,
      },
    });
  } catch (error) {
    next(error);
  }
};
