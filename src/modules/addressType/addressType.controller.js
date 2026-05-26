import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AddressType from './addressType.model.js';
import { AppError } from '../../utils/appError.util.js';
import { logAudit } from '../../utils/auditLogger.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to escape special characters in regex queries to prevent RegExp injection
const escapeRegex = (string) => {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

// Helper to safely delete local uploads without path traversal vulnerabilities
const safeUnlink = (fileUrlPath) => {
  if (!fileUrlPath || typeof fileUrlPath !== 'string') return;
  if (!fileUrlPath.startsWith('/uploads/')) return;

  try {
    const relativePath = fileUrlPath.startsWith('/') ? fileUrlPath.slice(1) : fileUrlPath;
    const resolvedPath = path.resolve(path.join(__dirname, '../../../public', relativePath));
    const baseUploadsDir = path.resolve(path.join(__dirname, '../../../public/uploads'));

    // Ensure target path is strictly within the public/uploads directory
    if (resolvedPath.startsWith(baseUploadsDir)) {
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
    }
  } catch {
    // ignore unlink errors
  }
};

/**
 * Add Address Type
 * Accepts multipart/form-data. Icon file is required on creation.
 */
export const addAddressType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { title, status } = req.body;

    // Icon file is required for creation
    if (!req.file) {
      throw new AppError('Address type icon image is required.', 400);
    }

    const normalizedTitle = title.trim();

    // Case-insensitive duplicate check
    const existing = await AddressType.findOne({
      title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
    }).session(session);

    if (existing) {
      throw new AppError(`Address type '${normalizedTitle}' already exists.`, 400);
    }

    const resolvedIconUrl = `/uploads/addressTypeIcons/${req.file.filename}`;

    const newAddressList = await AddressType.create(
      [
        {
          title: normalizedTitle,
          iconUrl: resolvedIconUrl,
          status: status || 'active',
          createdById: req.user ? req.user.id : null,
          createdByModel: req.userType || null,
          updatedById: req.user ? req.user.id : null,
          updatedByModel: req.userType || null,
        },
      ],
      { session }
    );

    const addressTypeResponse = newAddressList[0].toObject();

    await logAudit({
      req,
      action: 'CREATE',
      entityId: addressTypeResponse._id,
      entityType: 'AddressType',
      after: addressTypeResponse,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Address type added successfully.',
      data: addressTypeResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Cleanup newly uploaded file on failure
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore
      }
    }

    next(error);
  }
};

/**
 * Edit Address Type
 * Accepts multipart/form-data. Icon is optional — if sent, replaces the old one.
 */
export const editAddressType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let newFileUploaded = false;

  try {
    const { id } = req.params;
    const { title, status } = req.body;

    const addressType = await AddressType.findById(id).session(session);
    if (!addressType) {
      throw new AppError('Address type not found.', 404);
    }

    const beforeState = addressType.toObject();
    const oldIconUrl = addressType.iconUrl;

    if (title !== undefined) {
      const normalizedTitle = title.trim();
      if (normalizedTitle.toLowerCase() !== addressType.title.toLowerCase()) {
        const duplicate = await AddressType.findOne({
          title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
          _id: { $ne: id },
        }).session(session);

        if (duplicate) {
          throw new AppError(`Address type '${title}' already exists.`, 400);
        }
      }
      addressType.title = normalizedTitle;
    }

    if (status !== undefined) addressType.status = status;

    if (req.file) {
      newFileUploaded = true;
      addressType.iconUrl = `/uploads/addressTypeIcons/${req.file.filename}`;
    }

    addressType.updatedById = req.user ? req.user.id : null;
    addressType.updatedByModel = req.userType || null;

    await addressType.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: addressType._id,
      entityType: 'AddressType',
      before: beforeState,
      after: addressType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    // Safely delete old icon after successful transaction
    if (newFileUploaded && oldIconUrl) {
      safeUnlink(oldIconUrl);
    }

    res.status(200).json({
      status: true,
      message: 'Address type updated successfully.',
      data: addressType,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Cleanup newly uploaded file on failure
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore
      }
    }

    next(error);
  }
};

/**
 * Toggle Address Type Status
 * Restricted to super_admin.
 */
export const toggleAddressTypeStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const addressType = await AddressType.findById(id).session(session);
    if (!addressType) {
      throw new AppError('Address type not found.', 404);
    }

    const beforeState = addressType.toObject();
    const nextStatus = addressType.status === 'active' ? 'inactive' : 'active';
    addressType.status = nextStatus;

    addressType.updatedById = req.user ? req.user.id : null;
    addressType.updatedByModel = req.userType || null;

    await addressType.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: addressType._id,
      entityType: 'AddressType',
      before: beforeState,
      after: addressType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Address type status updated successfully to ${nextStatus}.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Delete Address Type
 * Restricted to super_admin.
 */
export const deleteAddressType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const addressType = await AddressType.findById(id).session(session);
    if (!addressType) {
      throw new AppError('Address type not found.', 404);
    }

    const beforeState = addressType.toObject();
    const iconToDelete = addressType.iconUrl;

    await AddressType.deleteOne({ _id: id }).session(session);

    await logAudit({
      req,
      action: 'DELETE',
      entityId: id,
      entityType: 'AddressType',
      before: beforeState,
      after: null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    // Delete the icon file from disk after successful deletion
    if (iconToDelete) {
      safeUnlink(iconToDelete);
    }

    res.status(200).json({
      status: true,
      message: 'Address type deleted successfully.',
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Get Address Types
 * Accessible to authenticated users. Supports search, pagination, filters, and sorting.
 */
export const getAddressTypes = async (req, res, next) => {
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

    // Non-admins are restricted to active address types
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

    const sortCriteria = {};
    sortCriteria[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [totalElements, addressTypes] = await Promise.all([
      AddressType.countDocuments(filter),
      AddressType.find(filter).sort(sortCriteria).skip(skip).limit(limit),
    ]);

    res.status(200).json({
      status: true,
      message: 'Address types fetched successfully.',
      data: {
        addressTypes,
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
