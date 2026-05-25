import cron from 'node-cron';
import { deleteOldLogs } from '../middlewares/logger.middleware.js';
import { autoExpirePromos } from '../modules/promo/promo.controller.js';

/**
 * Schedules all background cron jobs for the application.
 */
export const scheduleCronJobs = () => {
  console.log('⏳ Initializing scheduled cron jobs...');

  // 1. Daily logs cleanup (runs daily at 9:00 AM)
  cron.schedule('0 9 * * *', () => {
    deleteOldLogs();
  });

  // 2. Hourly promo code auto-expiration check (runs at the start of every hour)
  cron.schedule('0 * * * *', () => {
    autoExpirePromos();
  });
};
