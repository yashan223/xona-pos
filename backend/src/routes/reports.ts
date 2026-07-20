import { Router } from 'express';
import reportController from '../controllers/reportController.js';
const router = Router();
router.get('/frequent-errors', reportController.getPopularProducts);
router.get('/effective-solutions', reportController.getEffectiveProducts);
router.get('/developer-patterns', reportController.getPOSPatterns);
router.get('/timeline', reportController.getTimeline);
router.get('/stats', reportController.getStats);
router.get('/pdf', reportController.generatePdfReport);
router.get('/saved', reportController.listSavedReports);
router.delete('/saved/:id', reportController.deleteSavedReport);
router.post('/reset', reportController.resetDatabase);
router.post('/clear', reportController.clearDatabase);
router.get('/backups', reportController.listBackups);
router.post('/backups', reportController.createBackup);
router.post('/backups/:filename/restore', reportController.restoreBackup);
router.get('/backups/:filename/download', reportController.downloadBackup);
router.delete('/backups/:filename', reportController.deleteBackup);
router.post('/backups/upload', reportController.uploadBackup);
export default router;
