import cron from 'node-cron';
import { deleteOldLogs } from '../middlewares/logger.middleware.js';

/**
 * Schedules all background cron jobs for the application.
 */
export const scheduleCronJobs = () => {
  console.log('⏳ Initializing scheduled cron jobs...');

  // 1. Daily logs cleanup (runs daily at 9:00 AM)
  cron.schedule('0 9 * * *', () => {
    deleteOldLogs();
  });
};
