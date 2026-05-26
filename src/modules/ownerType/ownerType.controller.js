import mongoose from 'mongoose';
import OwnerType from './ownerType.model.js';
import { AppError } from '../../utils/appError.util.js';
import { logAudit } from '../../utils/auditLogger.util.js';

// Helper to escape special characters in regex queries to prevent RegExp injection
const escapeRegex = (string) => {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * Add Owner Type
 * Restricted to super_admin. Creates a new owner type configuration.
 */
export const addOwnerType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { title, status } = req.body;
    const normalizedTitle = title.trim();

    // Case-insensitive check for duplicate
    const existing = await OwnerType.findOne({
      title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
    }).session(session);

    if (existing) {
      throw new AppError(`Owner type '${normalizedTitle}' already exists.`, 400);
    }

    const newOwnerList = await OwnerType.create(
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

    const ownerTypeResponse = newOwnerList[0].toObject();

    await logAudit({
      req,
      action: 'CREATE',
      entityId: ownerTypeResponse._id,
      entityType: 'OwnerType',
      after: ownerTypeResponse,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Owner type added successfully.',
      data: ownerTypeResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Edit Owner Type
 * Restricted to super_admin. Updates an owner type configuration.
 */
export const editOwnerType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { title, status } = req.body;

    const ownerType = await OwnerType.findById(id).session(session);
    if (!ownerType) {
      throw new AppError('Owner type not found.', 404);
    }

    const beforeState = ownerType.toObject();

    if (title !== undefined) {
      const normalizedTitle = title.trim();
      if (normalizedTitle.toLowerCase() !== ownerType.title.toLowerCase()) {
        // Verify uniqueness
        const duplicate = await OwnerType.findOne({
          title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
          _id: { $ne: id },
        }).session(session);

        if (duplicate) {
          throw new AppError(`Owner type '${title}' already exists.`, 400);
        }
      }
      ownerType.title = normalizedTitle;
    }

    if (status !== undefined) {
      ownerType.status = status;
    }

    ownerType.updatedById = req.user ? req.user.id : null;
    ownerType.updatedByModel = req.userType || null;

    await ownerType.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: ownerType._id,
      entityType: 'OwnerType',
      before: beforeState,
      after: ownerType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Owner type updated successfully.',
      data: ownerType,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Toggle Owner Type Status
 * Restricted to super_admin. Toggles active/inactive.
 */
export const toggleOwnerTypeStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const ownerType = await OwnerType.findById(id).session(session);
    if (!ownerType) {
      throw new AppError('Owner type not found.', 404);
    }

    const beforeState = ownerType.toObject();
    const nextStatus = ownerType.status === 'active' ? 'inactive' : 'active';
    ownerType.status = nextStatus;

    ownerType.updatedById = req.user ? req.user.id : null;
    ownerType.updatedByModel = req.userType || null;

    await ownerType.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: ownerType._id,
      entityType: 'OwnerType',
      before: beforeState,
      after: ownerType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Owner type status updated successfully to ${nextStatus}.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Delete Owner Type
 * Restricted to super_admin. Deletes an owner type.
 */
export const deleteOwnerType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const ownerType = await OwnerType.findById(id).session(session);
    if (!ownerType) {
      throw new AppError('Owner type not found.', 404);
    }

    const beforeState = ownerType.toObject();

    await OwnerType.deleteOne({ _id: id }).session(session);

    await logAudit({
      req,
      action: 'DELETE',
      entityId: id,
      entityType: 'OwnerType',
      before: beforeState,
      after: null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Owner type deleted successfully.',
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Get Owner Types
 * Accessible to authenticated users. Supports search, pagination, filters, and sorting.
 */
export const getOwnerTypes = async (req, res, next) => {
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

    // Security check: non-admins are restricted to active owner types
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

    const [totalElements, ownerTypes] = await Promise.all([
      OwnerType.countDocuments(filter),
      OwnerType.find(filter).sort(sortCriteria).skip(skip).limit(limit),
    ]);

    res.status(200).json({
      status: true,
      message: 'Owner types fetched successfully.',
      data: {
        ownerTypes,
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
