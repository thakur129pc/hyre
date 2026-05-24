import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import Admin from './admin.model.js';
import AuditLog from '../audit/auditLog.model.js';
import { AppError } from '../../core/utils/appError.util.js';
import { logAudit } from '../../core/utils/auditLogger.util.js';
import Price from '../price/price.model.js';
import Promo from '../promo/promo.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createAdmin = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password, phone, role, assignedCityIds } = req.body;

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email }).session(session);
    if (existingAdmin) {
      throw new AppError('An admin with this email already exists.', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Admin
    const newAdmin = await Admin.create(
      [
        {
          name,
          email,
          password: hashedPassword,
          phone,
          role,
          assignedCityIds: role === 'super_admin' ? [] : assignedCityIds,
        },
      ],
      { session }
    );

    const adminResponse = newAdmin[0].toObject();
    delete adminResponse.password;

    await logAudit({
      req,
      action: 'CREATE',
      entityId: newAdmin[0]._id,
      entityType: 'Admin',
      after: adminResponse,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Admin created successfully.',
      data: adminResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const editAdmin = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { name, phone, assignedCityIds } = req.body;

    // Prevent modifying super_admin by a non-super_admin (just in case RBAC misses it)
    const adminToEdit = await Admin.findById(id).session(session);
    if (!adminToEdit) {
      throw new AppError('Admin not found.', 404);
    }

    // Only super_admin can edit other admins or themselves.
    // Handled by RBAC, but let's be strict: A super_admin shouldn't easily lose their role.

    const beforeState = adminToEdit.toObject();
    delete beforeState.password;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { name, phone, assignedCityIds: adminToEdit.role === 'super_admin' ? [] : assignedCityIds },
      { returnDocument: 'after', runValidators: true, session }
    );

    const afterState = updatedAdmin.toObject();
    delete afterState.password;

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: updatedAdmin._id,
      entityType: 'Admin',
      before: beforeState,
      after: afterState,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Admin updated successfully.',
      data: updatedAdmin,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const toggleAdminStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (req.user.id === id) {
      throw new AppError('You cannot deactivate your own account.', 400);
    }

    const admin = await Admin.findById(id).session(session);
    if (!admin) {
      throw new AppError('Admin not found.', 404);
    }

    if (admin.role === 'super_admin') {
      throw new AppError('Super admins cannot be deactivated.', 403);
    }

    const beforeState = admin.toObject();
    delete beforeState.password;

    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    admin.status = newStatus;
    await admin.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: admin._id,
      entityType: 'Admin',
      before: beforeState,
      after: admin.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Admin has been ${newStatus}d successfully.`,
      data: { status: newStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (req.user.id === id) {
      throw new AppError('You cannot delete your own account.', 400);
    }

    const admin = await Admin.findById(id).session(session);
    if (!admin) {
      throw new AppError('Admin not found.', 404);
    }

    if (admin.role === 'super_admin') {
      throw new AppError('Super admins cannot be deleted.', 403);
    }

    const beforeState = admin.toObject();
    delete beforeState.password;

    await Admin.findByIdAndDelete(id).session(session);

    await logAudit({
      req,
      action: 'DELETE',
      entityId: admin._id,
      entityType: 'Admin',
      before: beforeState,
      after: null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Admin deleted successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Reads logs from files using streams and readline for memory efficiency & event-loop friendliness.
 * Supports pagination.
 */
const readLogsFromFilePaginated = (logType, date, page = 1, limit = 100) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, '../../../logs', `${logType}-${date}.log`);

    if (!fs.existsSync(filePath)) {
      return reject(
        new AppError(`Log file not found for type '${logType}' and date '${date}'.`, 404)
      );
    }

    const instream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: instream,
      terminal: false,
    });

    const logs = [];
    let lineCount = 0;
    const startLine = (page - 1) * limit;
    const endLine = page * limit;

    rl.on('line', (line) => {
      if (lineCount >= startLine && lineCount < endLine) {
        try {
          logs.push(JSON.parse(line));
        } catch (err) {
          logs.push(line);
        }
      }
      lineCount++;
    });

    rl.on('close', () => {
      resolve({
        logs,
        totalLogs: lineCount,
        page,
        limit,
        totalPages: Math.ceil(lineCount / limit),
      });
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Fetch combined logs by date (with pagination)
 */
export const getCombinedLogs = async (req, res, next) => {
  try {
    const { date, page, limit } = req.body;
    const result = await readLogsFromFilePaginated('combined', date, page, limit);

    res.status(200).json({
      status: true,
      message: 'Combined logs fetched successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch error logs by date (with pagination)
 */
export const getErrorLogs = async (req, res, next) => {
  try {
    const { date, page, limit } = req.body;
    const result = await readLogsFromFilePaginated('error', date, page, limit);

    res.status(200).json({
      status: true,
      message: 'Error logs fetched successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch database audit logs with pagination, search parameters, and filters.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, startDate, endDate, actorId, actorType, action, entityId, entityType } =
      req.body;

    const filter = {};

    if (actorId) filter.actorId = actorId;
    if (actorType) filter.actorType = actorType;
    if (action) filter.action = action;
    if (entityId) filter.entityId = entityId;
    if (entityType) filter.entityType = entityType;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const totalLogs = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'actorId', select: '-password' })
      .populate({ path: 'entityId', select: '-password' });

    res.status(200).json({
      status: true,
      message: 'Audit logs fetched successfully.',
      data: {
        logs,
        totalLogs,
        page,
        limit,
        totalPages: Math.ceil(totalLogs / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
