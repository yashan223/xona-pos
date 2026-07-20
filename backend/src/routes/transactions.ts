import { Router } from 'express';
import transactionController from '../controllers/transactionController.js';
const router = Router();
router.post('/', transactionController.create);
router.get('/', transactionController.getAll);
router.get('/:id', transactionController.getById);
router.post('/:id/refund', transactionController.refund);
export default router;
