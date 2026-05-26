import AuditLog from './auditLog.model.js';

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
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLogs / limit),
        limitPerPage: limit,
        totalElements: totalLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};
