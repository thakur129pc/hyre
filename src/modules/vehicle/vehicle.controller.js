import mongoose from 'mongoose';
import VehicleType from './vehicleType.model.js';
import VehicleSubType from './vehicleSubType.model.js';
import Vehicle from './vehicle.model.js';
import { AppError } from '../../core/utils/appError.js';

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
    const existingType = await VehicleType.findOne({ typeName: normalizedTypeName }).session(session);
    if (existingType) {
      throw new AppError(`Vehicle type '${typeName}' already exists.`, 400);
    }

    const newType = await VehicleType.create([{
      typeName: normalizedTypeName,
    }], { session });

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
      throw new AppError(`Vehicle subtype '${subTypeName}' already exists under this vehicle type.`, 400);
    }

    const newSubType = await VehicleSubType.create([{
      subTypeName: normalizedSubTypeName,
      typeId,
    }], { session });

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
      throw new AppError('The specified vehicle sub type does not belong to the specified vehicle type.', 400);
    }

    // Uniqueness: Verify no same vehicle (same vehicleTypeId + vehicleSubTypeId) exists
    const existingVehicle = await Vehicle.findOne({
      vehicleTypeId,
      vehicleSubTypeId,
    }).session(session);
    if (existingVehicle) {
      throw new AppError('A vehicle catalog entry with this type and subtype combination already exists.', 400);
    }

    const newVehicle = await Vehicle.create([{
      vehicleTypeId,
      vehicleSubTypeId,
      category,
      title,
      description,
      numberOfWheels,
      maxPassengerCapacity,
      iconUrl,
      vehicleSpecs,
    }], { session });

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
    next(error);
  }
};
