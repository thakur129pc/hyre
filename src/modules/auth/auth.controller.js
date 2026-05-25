import AuthLog from './authLog.model.js';

/**
 * Fetch database auth logs with pagination, search parameters, and filters.
 */
export const getAuthLogs = async (req, res, next) => {
  try {
    const { page, limit, startDate, endDate, userId, userType, action, status, ipAddress } =
      req.body;

    const filter = {};

    if (userId) filter.userId = userId;
    if (userType) filter.userType = userType;
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (ipAddress) filter['metadata.ipAddress'] = ipAddress;

    if (startDate || endDate) {
      filter.performedAt = {};
      if (startDate) {
        filter.performedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.performedAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const totalLogs = await AuthLog.countDocuments(filter);
    const logs = await AuthLog.find(filter)
      .sort({ performedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'userId', select: '-password' });

    res.status(200).json({
      status: true,
      message: 'Auth logs fetched successfully.',
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
