import { Router } from 'express';
import reportController from '../controllers/reportController.js';

const router = Router();

// GET /api/reports/frequent-errors — Popular products (adapted from frequent errors)
router.get('/frequent-errors', reportController.getPopularProducts);

// GET /api/reports/effective-solutions — Top selling products (adapted from effective solutions)
router.get('/effective-solutions', reportController.getEffectiveProducts);

// GET /api/reports/developer-patterns — POS category & sales patterns
router.get('/developer-patterns', reportController.getPOSPatterns);

// GET /api/reports/timeline — Transaction logs timeline
router.get('/timeline', reportController.getTimeline);

// GET /api/reports/stats — Store statistics
router.get('/stats', reportController.getStats);

// GET /api/reports/pdf — Generate PDF sales report
router.get('/pdf', reportController.generatePdfReport);

// POST /api/reports/reset — Reset and seed POS database
router.post('/reset', reportController.resetDatabase);

// POST /api/reports/clear — Clear database (admin user retained)
router.post('/clear', reportController.clearDatabase);

// Backup & Restore operations
router.get('/backups', reportController.listBackups);
router.post('/backups', reportController.createBackup);
router.post('/backups/:filename/restore', reportController.restoreBackup);
router.get('/backups/:filename/download', reportController.downloadBackup);
router.delete('/backups/:filename', reportController.deleteBackup);
router.post('/backups/upload', reportController.uploadBackup);

export default router;
