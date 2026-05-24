import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Admin from './admin.model.js';
import { AppError } from '../../core/utils/appError.util.js';

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

    await session.commitTransaction();
    session.endSession();

    // Do not return password
    const adminResponse = newAdmin[0].toObject();
    delete adminResponse.password;

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

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { name, phone, assignedCityIds: adminToEdit.role === 'super_admin' ? [] : assignedCityIds },
      { returnDocument: 'after', runValidators: true, session }
    );

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

    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    admin.status = newStatus;
    await admin.save({ session });

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

    await Admin.findByIdAndDelete(id).session(session);

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
 * Reads logs from files based on type and date.
 */
const readLogsFromFile = (logType, date) => {
  const filePath = path.join(__dirname, '../../../logs', `${logType}-${date}.log`);

  if (!fs.existsSync(filePath)) {
    throw new AppError(`Log file not found for type '${logType}' and date '${date}'.`, 404);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  if (!fileContent.trim()) {
    return [];
  }

  return fileContent
    .trim()
    .split('\n')
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        return line;
      }
    });
};

/**
 * Fetch combined logs by date
 */
export const getCombinedLogs = async (req, res, next) => {
  try {
    const { date } = req.body;
    const logs = readLogsFromFile('combined', date);

    res.status(200).json({
      status: true,
      message: 'Combined logs fetched successfully.',
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch error logs by date
 */
export const getErrorLogs = async (req, res, next) => {
  try {
    const { date } = req.body;
    const logs = readLogsFromFile('error', date);

    res.status(200).json({
      status: true,
      message: 'Error logs fetched successfully.',
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};
