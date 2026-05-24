import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import City from './city.model.js';
import Vehicle from '../vehicle/vehicle.model.js';
import { AppError } from '../../core/utils/appError.util.js';
import { logAudit } from '../../core/utils/auditLogger.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to escape special characters in regex queries to prevent RegExp injection crashes
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
 * Create City API
 * Restricts name/state duplicate entries inside a Mongoose transaction and saves all fields.
 */
export const createCity = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      state,
      status,
      servicedPincodes,
      coordinates,
      allowedVehicles,
      activeVehicles,
      city_config,
    } = req.body;

    // Icon is required for creation
    if (!req.file) {
      throw new AppError('City icon image is required.', 400);
    }

    const normalizedName = name.trim();
    const normalizedState = state.trim();

    // Check for case-insensitive duplicate city in the same state
    const existingCity = await City.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(normalizedName)}$`, 'i') },
      state: { $regex: new RegExp(`^${escapeRegex(normalizedState)}$`, 'i') },
    }).session(session);

    if (existingCity) {
      throw new AppError(
        `City '${normalizedName}' in state '${normalizedState}' already exists.`,
        400
      );
    }

    // Verify referenced vehicles exist
    const allVehicleIdsToCheck = [...(allowedVehicles || []), ...(activeVehicles || [])];

    if (allVehicleIdsToCheck.length > 0) {
      const uniqueIds = [...new Set(allVehicleIdsToCheck)];
      const foundCount = await Vehicle.countDocuments({ _id: { $in: uniqueIds } }).session(session);
      if (foundCount !== uniqueIds.length) {
        throw new AppError('One or more referenced vehicles do not exist in the catalog.', 400);
      }
    }

    // Verify activeVehicles is a subset of allowed vehicles
    const activeSet = new Set(activeVehicles || []);
    const allowedSet = new Set(allowedVehicles || []);
    for (const activeId of activeSet) {
      if (!allowedSet.has(activeId)) {
        throw new AppError('Active vehicles must be a subset of allowed vehicles.', 400);
      }
    }

    const resolvedIconUrl = `/uploads/cityIcons/${req.file.filename}`;

    const newCity = await City.create(
      [
        {
          name: normalizedName,
          state: normalizedState,
          iconUrl: resolvedIconUrl,
          status: status || 'coming_soon',
          servicedPincodes: servicedPincodes || [],
          coordinates: coordinates || [],
          allowedVehicles: allowedVehicles || [],
          activeVehicles: activeVehicles || [],
          city_config: city_config || {},
        },
      ],
      { session }
    );

    await logAudit({
      req,
      action: 'CREATE',
      entityId: newCity[0]._id,
      entityType: 'City',
      after: newCity[0].toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'City created successfully.',
      data: newCity[0],
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
 * Edit City API
 * Updates name, state, iconUrl, configurations, status, pincodes, and coordinates securely.
 */
export const editCity = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let newFileUploaded = false;
  try {
    const { id } = req.params;
    const {
      name,
      state,
      status,
      servicedPincodes,
      coordinates,
      allowedVehicles,
      activeVehicles,
      city_config,
    } = req.body;

    const city = await City.findById(id).session(session);
    if (!city) {
      throw new AppError('City not found.', 404);
    }

    const beforeState = city.toObject();

    const targetName = name !== undefined ? name.trim() : city.name;
    const targetState = state !== undefined ? state.trim() : city.state;

    // Check for name/state duplicate index violation
    if (name !== undefined || state !== undefined) {
      const isNameChanged =
        name !== undefined && targetName.toLowerCase() !== city.name.toLowerCase();
      const isStateChanged =
        state !== undefined && targetState.toLowerCase() !== city.state.toLowerCase();

      if (isNameChanged || isStateChanged) {
        const duplicate = await City.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(targetName)}$`, 'i') },
          state: { $regex: new RegExp(`^${escapeRegex(targetState)}$`, 'i') },
          _id: { $ne: id },
        }).session(session);

        if (duplicate) {
          throw new AppError(`City '${targetName}' in state '${targetState}' already exists.`, 400);
        }
      }
    }

    // Verify referenced vehicles exist
    const allVehicleIdsToCheck = [...(allowedVehicles || []), ...(activeVehicles || [])];

    if (allVehicleIdsToCheck.length > 0) {
      const uniqueIds = [...new Set(allVehicleIdsToCheck)];
      const foundCount = await Vehicle.countDocuments({ _id: { $in: uniqueIds } }).session(session);
      if (foundCount !== uniqueIds.length) {
        throw new AppError('One or more referenced vehicles do not exist in the catalog.', 400);
      }
    }

    // Verify activeVehicles is a subset of allowed vehicles
    const targetAllowed =
      allowedVehicles !== undefined
        ? allowedVehicles
        : city.allowedVehicles.map((id) => id.toString());
    const targetActive =
      activeVehicles !== undefined
        ? activeVehicles
        : city.activeVehicles.map((id) => id.toString());

    const allowedSet = new Set(targetAllowed);
    for (const activeId of targetActive) {
      if (!allowedSet.has(activeId)) {
        throw new AppError('Active vehicles must be a subset of allowed vehicles.', 400);
      }
    }

    const oldIconUrl = city.iconUrl;

    // Apply updates
    if (name !== undefined) city.name = targetName;
    if (state !== undefined) city.state = targetState;
    if (status !== undefined) city.status = status;
    if (servicedPincodes !== undefined) city.servicedPincodes = servicedPincodes;
    if (coordinates !== undefined) city.coordinates = coordinates;
    if (allowedVehicles !== undefined) city.allowedVehicles = allowedVehicles;
    if (activeVehicles !== undefined) city.activeVehicles = activeVehicles;

    if (city_config !== undefined) {
      // Merge keys to support partial config updates
      city.city_config = {
        ...city.city_config,
        ...city_config,
      };
    }

    if (req.file) {
      newFileUploaded = true;
      city.iconUrl = `/uploads/cityIcons/${req.file.filename}`;
    }

    await city.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: city._id,
      entityType: 'City',
      before: beforeState,
      after: city.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    // Safely delete old icon URL if replacement succeeded
    if (newFileUploaded && oldIconUrl) {
      safeUnlink(oldIconUrl);
    }

    res.status(200).json({
      status: true,
      message: 'City updated successfully.',
      data: city,
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
 * Toggle City Status API
 * transitions coming_soon -> active -> inactive -> active.
 */
export const toggleCityStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const city = await City.findById(id).session(session);
    if (!city) {
      throw new AppError('City not found.', 404);
    }

    const beforeState = city.toObject();

    // Toggle logic: If coming_soon or inactive, activate it. Otherwise, deactivate.
    const nextStatus = city.status === 'active' ? 'inactive' : 'active';
    city.status = nextStatus;

    await city.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: city._id,
      entityType: 'City',
      before: beforeState,
      after: city.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `City status has been updated to '${nextStatus}'.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Fetch Cities API
 * Filters by state (case-insensitive regex) and status.
 */
export const getCities = async (req, res, next) => {
  try {
    const { state, status } = req.body;
    const query = {};

    if (state) {
      query.state = { $regex: new RegExp(escapeRegex(state.trim()), 'i') };
    }
    if (status) {
      query.status = status;
    }

    const cities = await City.find(query).sort({ name: 1 });

    res.status(200).json({
      status: true,
      message: 'Cities fetched successfully.',
      data: cities,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch City by ID API
 */
export const getCityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const city = await City.findById(id);
    if (!city) {
      throw new AppError('City not found.', 404);
    }

    res.status(200).json({
      status: true,
      message: 'City fetched successfully.',
      data: city,
    });
  } catch (error) {
    next(error);
  }
};
