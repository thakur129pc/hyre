import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import VehicleType from './vehicleType.model.js';
import VehicleSubType from './vehicleSubType.model.js';
import Vehicle from './vehicle.model.js';
import { AppError } from '../../utils/appError.util.js';
import { logAudit } from '../../utils/auditLogger.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  } catch (err) {
    // ignore unlink errors
  }
};

/**
 * Add Vehicle Type API
 * Creates a base vehicle category like car, rickshaw, two-wheeler.
 */
export const addVehicleType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { typeName } = req.body;
    const normalizedTypeName = typeName.toLowerCase().trim();

    // Check if vehicle type already exists
    const existingType = await VehicleType.findOne({ typeName: normalizedTypeName }).session(
      session
    );
    if (existingType) {
      throw new AppError(`Vehicle type '${typeName}' already exists.`, 400);
    }

    const newType = await VehicleType.create(
      [
        {
          typeName: normalizedTypeName,
        },
      ],
      { session }
    );

    await logAudit({
      req,
      action: 'CREATE',
      entityId: newType[0]._id,
      entityType: 'VehicleType',
      after: newType[0].toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Vehicle type added successfully.',
      data: newType[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Add Vehicle Sub Type API
 * Creates a subtype (e.g. suv, sedan) linked to a base vehicle type.
 */
export const addVehicleSubType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { subTypeName, typeId } = req.body;
    const normalizedSubTypeName = subTypeName.toLowerCase().trim();

    // Verify that the parent Vehicle Type exists
    const vehicleType = await VehicleType.findById(typeId).session(session);
    if (!vehicleType) {
      throw new AppError('The specified Vehicle Type does not exist.', 404);
    }

    // Verify that this subtype doesn't already exist under the same base type
    const existingSubType = await VehicleSubType.findOne({
      typeId,
      subTypeName: normalizedSubTypeName,
    }).session(session);
    if (existingSubType) {
      throw new AppError(
        `Vehicle subtype '${subTypeName}' already exists under this vehicle type.`,
        400
      );
    }

    const newSubType = await VehicleSubType.create(
      [
        {
          subTypeName: normalizedSubTypeName,
          typeId,
        },
      ],
      { session }
    );

    await logAudit({
      req,
      action: 'CREATE',
      entityId: newSubType[0]._id,
      entityType: 'VehicleSubType',
      after: newSubType[0].toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Vehicle subtype added successfully.',
      data: newSubType[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Add Vehicle API
 * Creates a catalog master entry linking type and subtype.
 */
export const addVehicle = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      vehicleTypeId,
      vehicleSubTypeId,
      category,
      title,
      description,
      numberOfWheels,
      maxPassengerCapacity,
      iconUrl,
      vehicleSpecs,
    } = req.body;

    // Verify Vehicle Type exists
    const vehicleType = await VehicleType.findById(vehicleTypeId).session(session);
    if (!vehicleType) {
      throw new AppError('The specified Vehicle Type does not exist.', 404);
    }

    // Verify Vehicle Sub Type exists
    const vehicleSubType = await VehicleSubType.findById(vehicleSubTypeId).session(session);
    if (!vehicleSubType) {
      throw new AppError('The specified Vehicle Sub Type does not exist.', 404);
    }

    // Relational Integrity: Verify subtype belongs to the specified vehicle type
    if (vehicleSubType.typeId.toString() !== vehicleTypeId) {
      throw new AppError(
        'The specified vehicle sub type does not belong to the specified vehicle type.',
        400
      );
    }

    // Uniqueness: Verify no same vehicle (same vehicleTypeId + vehicleSubTypeId) exists
    const existingVehicle = await Vehicle.findOne({
      vehicleTypeId,
      vehicleSubTypeId,
    }).session(session);
    if (existingVehicle) {
      throw new AppError(
        'A vehicle catalog entry with this type and subtype combination already exists.',
        400
      );
    }

    // Handle dynamic icon upload path
    const resolvedIconUrl = req.file
      ? `/uploads/vehicleCatalogIcons/${req.file.filename}`
      : iconUrl || '';

    const newVehicle = await Vehicle.create(
      [
        {
          vehicleTypeId,
          vehicleSubTypeId,
          category,
          title,
          description,
          numberOfWheels,
          maxPassengerCapacity,
          iconUrl: resolvedIconUrl,
          vehicleSpecs,
        },
      ],
      { session }
    );

    await logAudit({
      req,
      action: 'CREATE',
      entityId: newVehicle[0]._id,
      entityType: 'Vehicle',
      after: newVehicle[0].toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Vehicle catalog entry added successfully.',
      data: newVehicle[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Secure Cleanup: Delete newly uploaded file if database/validation operation fails
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        // ignore
      }
    }

    next(error);
  }
};

/**
 * Fetch All Vehicle Types
 */
export const getVehicleTypes = async (req, res, next) => {
  try {
    const types = await VehicleType.find().sort({ typeName: 1 });
    res.status(200).json({
      status: true,
      message: 'Vehicle types fetched successfully.',
      data: types,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch Vehicle Sub Types with respect to Type ID
 */
export const getVehicleSubTypes = async (req, res, next) => {
  try {
    const { typeId } = req.body;

    const subTypes = await VehicleSubType.find({ typeId }).sort({ subTypeName: 1 });
    res.status(200).json({
      status: true,
      message: 'Vehicle subtypes fetched successfully.',
      data: subTypes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch Vehicles with filters (vehicleTypeId, status)
 */
export const getVehicles = async (req, res, next) => {
  try {
    const { vehicleTypeId, status } = req.body;
    const query = {};

    if (vehicleTypeId) query.vehicleTypeId = vehicleTypeId;
    if (status) query.status = status;

    const vehicles = await Vehicle.find(query)
      .populate('vehicleTypeId')
      .populate('vehicleSubTypeId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: true,
      message: 'Vehicles catalog fetched successfully.',
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit Vehicle Type
 */
export const editVehicleType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { typeName, description } = req.body;

    const vehicleType = await VehicleType.findById(id).session(session);
    if (!vehicleType) {
      throw new AppError('Vehicle type not found.', 404);
    }

    const beforeState = vehicleType.toObject();

    if (typeName) {
      const normalizedTypeName = typeName.toLowerCase().trim();
      if (normalizedTypeName !== vehicleType.typeName) {
        // Check for duplicate names
        const duplicate = await VehicleType.findOne({ typeName: normalizedTypeName }).session(
          session
        );
        if (duplicate) {
          throw new AppError(`Vehicle type '${typeName}' already exists.`, 400);
        }
        vehicleType.typeName = normalizedTypeName;
      }
    }

    await vehicleType.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: vehicleType._id,
      entityType: 'VehicleType',
      before: beforeState,
      after: vehicleType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Vehicle type updated successfully.',
      data: vehicleType,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Toggle Vehicle Type Active/Inactive Status
 */
export const toggleVehicleTypeStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const vehicleType = await VehicleType.findById(id).session(session);
    if (!vehicleType) {
      throw new AppError('Vehicle type not found.', 404);
    }

    const beforeState = vehicleType.toObject();

    const nextStatus = vehicleType.status === 'active' ? 'inactive' : 'active';
    vehicleType.status = nextStatus;

    await vehicleType.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: vehicleType._id,
      entityType: 'VehicleType',
      before: beforeState,
      after: vehicleType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Vehicle type has been ${nextStatus}d successfully.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Edit Vehicle Sub Type
 */
export const editVehicleSubType = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { subTypeName, typeId, description } = req.body;

    const vehicleSubType = await VehicleSubType.findById(id).session(session);
    if (!vehicleSubType) {
      throw new AppError('Vehicle subtype not found.', 404);
    }

    const beforeState = vehicleSubType.toObject();

    const currentTypeId = typeId || vehicleSubType.typeId;
    const currentSubTypeName = subTypeName
      ? subTypeName.toLowerCase().trim()
      : vehicleSubType.subTypeName;

    // Verify parent vehicle type if updated
    if (typeId && typeId !== vehicleSubType.typeId.toString()) {
      const typeExists = await VehicleType.findById(typeId).session(session);
      if (!typeExists) {
        throw new AppError('The specified Vehicle Type does not exist.', 404);
      }
    }

    // Check duplicate if either subtype name or type association is changed
    if (subTypeName || typeId) {
      const isNameChanged = subTypeName && currentSubTypeName !== vehicleSubType.subTypeName;
      const isTypeChanged = typeId && typeId !== vehicleSubType.typeId.toString();

      if (isNameChanged || isTypeChanged) {
        const duplicate = await VehicleSubType.findOne({
          typeId: currentTypeId,
          subTypeName: currentSubTypeName,
        }).session(session);

        if (duplicate) {
          throw new AppError(
            `Vehicle subtype '${currentSubTypeName}' already exists under this vehicle type.`,
            400
          );
        }
      }
    }

    if (subTypeName) vehicleSubType.subTypeName = currentSubTypeName;
    if (typeId) vehicleSubType.typeId = typeId;

    await vehicleSubType.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: vehicleSubType._id,
      entityType: 'VehicleSubType',
      before: beforeState,
      after: vehicleSubType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Vehicle subtype updated successfully.',
      data: vehicleSubType,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Toggle Vehicle Sub Type Active/Inactive Status
 */
export const toggleVehicleSubTypeStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const vehicleSubType = await VehicleSubType.findById(id).session(session);
    if (!vehicleSubType) {
      throw new AppError('Vehicle subtype not found.', 404);
    }

    const beforeState = vehicleSubType.toObject();

    const nextStatus = vehicleSubType.status === 'active' ? 'inactive' : 'active';
    vehicleSubType.status = nextStatus;

    await vehicleSubType.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: vehicleSubType._id,
      entityType: 'VehicleSubType',
      before: beforeState,
      after: vehicleSubType.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Vehicle subtype has been ${nextStatus}d successfully.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Edit Vehicle Catalog Entry
 */
export const editVehicle = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let newFileUploaded = false;
  try {
    const { id } = req.params;
    const {
      vehicleTypeId,
      vehicleSubTypeId,
      category,
      title,
      description,
      numberOfWheels,
      maxPassengerCapacity,
      iconUrl,
      vehicleSpecs,
    } = req.body;

    const vehicle = await Vehicle.findById(id).session(session);
    if (!vehicle) {
      throw new AppError('Vehicle catalog entry not found.', 404);
    }

    const beforeState = vehicle.toObject();

    const targetTypeId = vehicleTypeId || vehicle.vehicleTypeId;
    const targetSubTypeId = vehicleSubTypeId || vehicle.vehicleSubTypeId;

    // Run relational and compound checks if type or subtype changes
    if (vehicleTypeId || vehicleSubTypeId) {
      const isTypeChanged = vehicleTypeId && vehicleTypeId !== vehicle.vehicleTypeId.toString();
      const isSubTypeChanged =
        vehicleSubTypeId && vehicleSubTypeId !== vehicle.vehicleSubTypeId.toString();

      if (isTypeChanged || isSubTypeChanged) {
        // Validate type exists
        const typeExists = await VehicleType.findById(targetTypeId).session(session);
        if (!typeExists) {
          throw new AppError('The specified Vehicle Type does not exist.', 404);
        }

        // Validate subtype exists
        const subTypeExists = await VehicleSubType.findById(targetSubTypeId).session(session);
        if (!subTypeExists) {
          throw new AppError('The specified Vehicle Sub Type does not exist.', 404);
        }

        // Validate relational compatibility
        if (subTypeExists.typeId.toString() !== targetTypeId.toString()) {
          throw new AppError(
            'The specified vehicle sub type does not belong to the specified vehicle type.',
            400
          );
        }

        // Check unique index violation
        const duplicate = await Vehicle.findOne({
          vehicleTypeId: targetTypeId,
          vehicleSubTypeId: targetSubTypeId,
          _id: { $ne: id }, // Exclude self
        }).session(session);

        if (duplicate) {
          throw new AppError(
            'A vehicle catalog entry with this type and subtype combination already exists.',
            400
          );
        }
      }
    }

    const oldIconUrl = vehicle.iconUrl;

    // Apply updates
    if (vehicleTypeId) vehicle.vehicleTypeId = vehicleTypeId;
    if (vehicleSubTypeId) vehicle.vehicleSubTypeId = vehicleSubTypeId;
    if (category) vehicle.category = category;
    if (title) vehicle.title = title;
    if (description !== undefined) vehicle.description = description;
    if (numberOfWheels) vehicle.numberOfWheels = numberOfWheels;
    if (maxPassengerCapacity) vehicle.maxPassengerCapacity = maxPassengerCapacity;

    // Handle dynamic icon upload
    if (req.file) {
      newFileUploaded = true;
      vehicle.iconUrl = `/uploads/vehicleCatalogIcons/${req.file.filename}`;
    } else if (iconUrl !== undefined) {
      vehicle.iconUrl = iconUrl;
    }

    if (vehicleSpecs) {
      vehicle.vehicleSpecs = {
        ...vehicle.vehicleSpecs,
        ...vehicleSpecs,
      };
    }

    await vehicle.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: vehicle._id,
      entityType: 'Vehicle',
      before: beforeState,
      after: vehicle.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    // Clean up old file if a new file was uploaded successfully and there was an old file
    if (newFileUploaded && oldIconUrl) {
      safeUnlink(oldIconUrl);
    }

    res.status(200).json({
      status: true,
      message: 'Vehicle catalog entry updated successfully.',
      data: vehicle,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Secure Cleanup: Delete newly uploaded file if database/validation operation fails
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        // ignore
      }
    }

    next(error);
  }
};

/**
 * Toggle Vehicle Catalog Entry Active/Inactive Status
 */
export const toggleVehicleStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findById(id).session(session);
    if (!vehicle) {
      throw new AppError('Vehicle catalog entry not found.', 404);
    }

    const beforeState = vehicle.toObject();

    const nextStatus = vehicle.status === 'active' ? 'inactive' : 'active';
    vehicle.status = nextStatus;

    await vehicle.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: vehicle._id,
      entityType: 'Vehicle',
      before: beforeState,
      after: vehicle.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Vehicle catalog entry has been ${nextStatus}d successfully.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
