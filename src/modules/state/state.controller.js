import mongoose from 'mongoose';
import State from './state.model.js';
import { AppError } from '../../utils/appError.util.js';
import { logAudit } from '../../utils/auditLogger.util.js';

// Helper to escape special regex characters
const escapeRegex = (string) => {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * Add State
 * Restricted to super_admin. stateCode must be unique per country.
 */
export const addState = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { stateName, stateCode, country, countryCode, capital, timezone, status } = req.body;

    const normalizedStateName = stateName.trim();
    const normalizedStateCode = stateCode.trim().toUpperCase();
    const normalizedCountry = country.trim();

    // Duplicate check: stateCode must be unique within a country (case-insensitive)
    const existing = await State.findOne({
      stateCode: { $regex: new RegExp(`^${escapeRegex(normalizedStateCode)}$`, 'i') },
      country: { $regex: new RegExp(`^${escapeRegex(normalizedCountry)}$`, 'i') },
    }).session(session);

    if (existing) {
      throw new AppError(
        `State with code '${normalizedStateCode}' already exists in '${normalizedCountry}'.`,
        400
      );
    }

    const newStateList = await State.create(
      [
        {
          stateName: normalizedStateName,
          stateCode: normalizedStateCode,
          country: normalizedCountry,
          countryCode: countryCode ? countryCode.trim().toUpperCase() : '',
          capital: capital ? capital.trim() : '',
          timezone: timezone ? timezone.trim() : '',
          status: status || 'active',
          createdById: req.user ? req.user.id : null,
          createdByModel: req.userType || null,
          updatedById: req.user ? req.user.id : null,
          updatedByModel: req.userType || null,
        },
      ],
      { session }
    );

    const stateResponse = newStateList[0].toObject();

    await logAudit({
      req,
      action: 'CREATE',
      entityId: stateResponse._id,
      entityType: 'State',
      after: stateResponse,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'State added successfully.',
      data: stateResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Edit State
 * Restricted to super_admin. Re-validates uniqueness if stateCode or country changes.
 */
export const editState = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { stateName, stateCode, country, countryCode, capital, timezone, status } = req.body;

    const state = await State.findById(id).session(session);
    if (!state) {
      throw new AppError('State not found.', 404);
    }

    const beforeState = state.toObject();

    // Re-check uniqueness if stateCode or country is being changed
    const newStateCode = stateCode ? stateCode.trim().toUpperCase() : state.stateCode;
    const newCountry = country ? country.trim() : state.country;

    const isCodeChanging = newStateCode !== state.stateCode;
    const isCountryChanging = newCountry.toLowerCase() !== state.country.toLowerCase();

    if (isCodeChanging || isCountryChanging) {
      const duplicate = await State.findOne({
        stateCode: { $regex: new RegExp(`^${escapeRegex(newStateCode)}$`, 'i') },
        country: { $regex: new RegExp(`^${escapeRegex(newCountry)}$`, 'i') },
        _id: { $ne: id },
      }).session(session);

      if (duplicate) {
        throw new AppError(
          `State with code '${newStateCode}' already exists in '${newCountry}'.`,
          400
        );
      }
    }

    if (stateName !== undefined) state.stateName = stateName.trim();
    if (stateCode !== undefined) state.stateCode = newStateCode;
    if (country !== undefined) state.country = newCountry;
    if (countryCode !== undefined) state.countryCode = countryCode.trim().toUpperCase();
    if (capital !== undefined) state.capital = capital.trim();
    if (timezone !== undefined) state.timezone = timezone.trim();
    if (status !== undefined) state.status = status;

    state.updatedById = req.user ? req.user.id : null;
    state.updatedByModel = req.userType || null;

    await state.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: state._id,
      entityType: 'State',
      before: beforeState,
      after: state.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'State updated successfully.',
      data: state,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Toggle State Status
 * Restricted to super_admin.
 */
export const toggleStateStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const state = await State.findById(id).session(session);
    if (!state) {
      throw new AppError('State not found.', 404);
    }

    const beforeState = state.toObject();
    const nextStatus = state.status === 'active' ? 'inactive' : 'active';
    state.status = nextStatus;

    state.updatedById = req.user ? req.user.id : null;
    state.updatedByModel = req.userType || null;

    await state.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: state._id,
      entityType: 'State',
      before: beforeState,
      after: state.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `State status updated to ${nextStatus}.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Delete State
 * Restricted to super_admin.
 */
export const deleteState = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const state = await State.findById(id).session(session);
    if (!state) {
      throw new AppError('State not found.', 404);
    }

    const beforeState = state.toObject();

    await State.deleteOne({ _id: id }).session(session);

    await logAudit({
      req,
      action: 'DELETE',
      entityId: id,
      entityType: 'State',
      before: beforeState,
      after: null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'State deleted successfully.',
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Get States (list)
 * Accessible to all authenticated users.
 * Supports: full-text search on stateName/stateCode, country filter, status filter, sorting, pagination.
 */
export const getStates = async (req, res, next) => {
  try {
    const {
      search = '',
      country = '',
      status = 'all',
      sortBy = 'stateName',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = req.body;

    const filter = {};

    // Non-admins only see active states
    if (req.userType !== 'Admin') {
      filter.status = 'active';
    } else {
      if (status && status !== 'all') {
        filter.status = status;
      }
    }

    // Filter by country (case-insensitive)
    if (country && country.trim()) {
      filter.country = { $regex: new RegExp(escapeRegex(country.trim()), 'i') };
    }

    // Full-text search: matches stateName OR stateCode
    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ stateName: searchRegex }, { stateCode: searchRegex }];
    }

    const sortCriteria = {};
    sortCriteria[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [totalElements, states] = await Promise.all([
      State.countDocuments(filter),
      State.find(filter).sort(sortCriteria).skip(skip).limit(limit),
    ]);

    res.status(200).json({
      status: true,
      message: 'States fetched successfully.',
      data: {
        states,
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

/**
 * Get State by Name or Code
 * Accessible to all authenticated users.
 * Accepts stateName or stateCode; optionally narrow by country.
 */
export const getStateByIdentifier = async (req, res, next) => {
  try {
    const { stateName, stateCode, country } = req.body;

    const filter = {};

    if (stateCode) {
      filter.stateCode = { $regex: new RegExp(`^${escapeRegex(stateCode.trim())}$`, 'i') };
    } else if (stateName) {
      filter.stateName = { $regex: new RegExp(`^${escapeRegex(stateName.trim())}$`, 'i') };
    }

    // Narrow down by country if provided
    if (country && country.trim()) {
      filter.country = { $regex: new RegExp(`^${escapeRegex(country.trim())}$`, 'i') };
    }

    // Non-admins only see active states
    if (req.userType !== 'Admin') {
      filter.status = 'active';
    }

    const state = await State.findOne(filter);

    if (!state) {
      throw new AppError('State not found.', 404);
    }

    res.status(200).json({
      status: true,
      message: 'State fetched successfully.',
      data: state,
    });
  } catch (error) {
    next(error);
  }
};
