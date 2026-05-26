import mongoose from 'mongoose';
import Language from './language.model.js';
import { AppError } from '../../utils/appError.util.js';
import { logAudit } from '../../utils/auditLogger.util.js';

/**
 * Add Language
 * Restricted to super_admin. Creates a new language configuration.
 */
export const addLanguage = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      languageCode,
      languageName,
      languageNameInEnglish,
      isRTL,
      isDefault,
      status,
      dictionary,
    } = req.body;
    const normalizedCode = languageCode.trim().toLowerCase();

    // Check duplicate
    const existing = await Language.findOne({ languageCode: normalizedCode }).session(session);
    if (existing) {
      throw new AppError(`Language code '${normalizedCode}' already exists.`, 400);
    }

    // If marked as default, unset other defaults
    if (isDefault) {
      await Language.updateMany({ isDefault: true }, { $set: { isDefault: false } }).session(
        session
      );
    }

    const newLang = await Language.create(
      [
        {
          languageCode: normalizedCode,
          languageName,
          languageNameInEnglish,
          isRTL: isRTL || false,
          isDefault: isDefault || false,
          status: status || 'active',
          dictionary,
          createdById: req.user ? req.user.id : null,
          createdByModel: req.userType || null,
          updatedById: req.user ? req.user.id : null,
          updatedByModel: req.userType || null,
        },
      ],
      { session }
    );

    await logAudit({
      req,
      action: 'CREATE',
      entityId: newLang[0]._id,
      entityType: 'Language',
      after: newLang[0].toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: true,
      message: 'Language configuration added successfully.',
      data: newLang[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Edit Language
 * Restricted to super_admin. Updates a language.
 */
export const editLanguage = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      languageCode,
      languageName,
      languageNameInEnglish,
      isRTL,
      isDefault,
      status,
      dictionary,
    } = req.body;

    const lang = await Language.findById(id).session(session);
    if (!lang) {
      throw new AppError('Language not found.', 404);
    }

    const beforeState = lang.toObject();

    // If changing languageCode, verify uniqueness
    if (languageCode) {
      const normalizedCode = languageCode.trim().toLowerCase();
      if (normalizedCode !== lang.languageCode) {
        const duplicate = await Language.findOne({ languageCode: normalizedCode }).session(session);
        if (duplicate) {
          throw new AppError(`Language code '${languageCode}' already exists.`, 400);
        }
        lang.languageCode = normalizedCode;
      }
    }

    if (languageName !== undefined) lang.languageName = languageName;
    if (languageNameInEnglish !== undefined) lang.languageNameInEnglish = languageNameInEnglish;
    if (isRTL !== undefined) lang.isRTL = isRTL;

    // If setting default, reset others
    if (isDefault) {
      await Language.updateMany({ isDefault: true }, { $set: { isDefault: false } }).session(
        session
      );
      lang.isDefault = true;
      // Enforce status active if it's default
      lang.status = 'active';
    } else if (isDefault === false) {
      // Prevent unsetting default if this is the only default
      if (lang.isDefault) {
        throw new AppError(
          'Cannot unset default language. Make another language default first.',
          400
        );
      }
    }

    if (status !== undefined) {
      if (status === 'inactive' && lang.isDefault) {
        throw new AppError('Cannot deactivate the default language.', 400);
      }
      lang.status = status;
    }

    if (dictionary !== undefined) {
      lang.dictionary = {
        ...lang.dictionary,
        ...dictionary,
      };
    }

    lang.updatedById = req.user ? req.user.id : null;
    lang.updatedByModel = req.userType || null;

    await lang.save({ session });

    await logAudit({
      req,
      action: 'UPDATE',
      entityId: lang._id,
      entityType: 'Language',
      before: beforeState,
      after: lang.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Language configuration updated successfully.',
      data: lang,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Toggle Language Status
 * Restricted to super_admin.
 */
export const toggleLanguageStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const lang = await Language.findById(id).session(session);
    if (!lang) {
      throw new AppError('Language not found.', 404);
    }

    if (lang.isDefault && lang.status === 'active') {
      throw new AppError('Cannot deactivate the default language.', 400);
    }

    const beforeState = lang.toObject();
    const nextStatus = lang.status === 'active' ? 'inactive' : 'active';
    lang.status = nextStatus;
    lang.updatedById = req.user ? req.user.id : null;
    lang.updatedByModel = req.userType || null;

    await lang.save({ session });

    await logAudit({
      req,
      action: 'TOGGLE_STATUS',
      entityId: lang._id,
      entityType: 'Language',
      before: beforeState,
      after: lang.toObject(),
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: `Language status updated successfully to ${nextStatus}.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Delete Language
 * Restricted to super_admin.
 */
export const deleteLanguage = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const lang = await Language.findById(id).session(session);
    if (!lang) {
      throw new AppError('Language not found.', 404);
    }

    if (lang.isDefault) {
      throw new AppError(
        'Cannot delete the default language. Assign another default language first.',
        400
      );
    }

    const beforeState = lang.toObject();

    await Language.deleteOne({ _id: id }).session(session);

    await logAudit({
      req,
      action: 'DELETE',
      entityId: id,
      entityType: 'Language',
      before: beforeState,
      after: null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: 'Language deleted successfully.',
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Get Languages List
 * Admins can get all. Passengers/Riders get active ones only.
 */
export const getLanguages = async (req, res, next) => {
  try {
    const {
      search = '',
      status = 'all',
      isRTL,
      isDefault,
      sortBy = 'languageName',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = req.body;

    const filter = {};

    // Security check: non-admins are restricted strictly to active languages
    if (req.userType !== 'Admin') {
      filter.status = 'active';
    } else {
      if (status && status !== 'all') {
        filter.status = status;
      }
    }

    // Filter by RTL direction
    if (isRTL !== undefined) filter.isRTL = isRTL;

    // Filter by default language flag
    if (isDefault !== undefined) filter.isDefault = isDefault;

    // Search by languageName, languageNameInEnglish, or languageCode
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      filter.$or = [
        { languageName: searchRegex },
        { languageNameInEnglish: searchRegex },
        { languageCode: searchRegex },
      ];
    }

    // Sorting logic
    // Default language is always pinned to the top, followed by dynamic sort request
    const sortCriteria = { isDefault: -1 };
    sortCriteria[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;

    const [totalElements, languages] = await Promise.all([
      Language.countDocuments(filter),
      Language.find(filter).sort(sortCriteria).skip(skip).limit(limit),
    ]);

    res.status(200).json({
      status: true,
      message: 'Languages fetched successfully.',
      data: {
        languages,
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
 * Get Language by Code
 */
export const getLanguageByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const normalizedCode = code.trim().toLowerCase();

    const language = await Language.findOne({ languageCode: normalizedCode });
    if (!language) {
      throw new AppError(`Language with code '${normalizedCode}' not found.`, 404);
    }

    if (language.status !== 'active' && req.userType !== 'Admin') {
      throw new AppError('The specified language is not currently active.', 400);
    }

    res.status(200).json({
      status: true,
      message: 'Language dictionary fetched successfully.',
      data: language,
    });
  } catch (error) {
    next(error);
  }
};
