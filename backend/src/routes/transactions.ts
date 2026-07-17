import { Router } from 'express';
import transactionController from '../controllers/transactionController.js';

const router = Router();

// POST /api/transactions — Create a new checkout transaction
router.post('/', transactionController.create);

// GET /api/transactions — List all transactions
router.get('/', transactionController.getAll);

// GET /api/transactions/:id — Get specific transaction details
router.get('/:id', transactionController.getById);

// POST /api/transactions/:id/refund — Refund a transaction and restore inventory
router.post('/:id/refund', transactionController.refund);

export default router;
