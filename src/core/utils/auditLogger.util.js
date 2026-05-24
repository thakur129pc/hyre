import AuditLog from '../../modules/audit/auditLog.model.js';

/**
 * Reusable utility to log polymorphic audit log records to MongoDB.
 * Automatically extracts actor credentials, IP, and User Agent from Express request.
 * Supports transactional execution via Mongoose sessions.
 *
 * @param {Object} params
 * @param {Object} params.req - Express Request object
 * @param {String} params.action - Action performed (CREATE, UPDATE, DELETE, etc.)
 * @param {mongoose.Types.ObjectId|String} params.entityId - ID of the target document
 * @param {String} params.entityType - Type of target entity (City, Vehicle, Rider, Admin, etc.)
 * @param {mongoose.Types.ObjectId|String} [params.actorId] - Override performer ID (for unauthenticated actions)
 * @param {String} [params.actorType] - Override performer type (for unauthenticated actions)
 * @param {Object} [params.before] - Snapshot of target document before modification
 * @param {Object} [params.after] - Snapshot of target document after modification
 * @param {mongoose.ClientSession} [params.session] - Active mongoose transaction session
 */
export const logAudit = async ({
  req,
  action,
  entityId,
  entityType,
  actorId = null,
  actorType = null,
  before = null,
  after = null,
  session = null,
}) => {
  try {
    const finalActorId = actorId || req.user?.id;
    const finalActorType = actorType || req.userType || 'Admin';

    if (!finalActorId) {
      // If no actor can be identified, do not crash but skip logging
      return;
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const logEntry = {
      actorId: finalActorId,
      actorType: finalActorType,
      action,
      entityId,
      entityType,
      changes: { before, after },
      ipAddress,
      userAgent,
    };

    if (session) {
      await AuditLog.create([logEntry], { session });
    } else {
      await AuditLog.create(logEntry);
    }
  } catch (err) {
    // Fail silently in production to avoid blocking main application operations
    console.error('Audit Trail logging failed:', err.message);
  }
};
export default logAudit;
