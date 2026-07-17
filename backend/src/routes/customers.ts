import { Router } from 'express';
import customerController from '../controllers/customerController.js';

const router = Router();

// POST /api/customers — Create a new customer
router.post('/', customerController.create);

// GET /api/customers — List all customers
router.get('/', customerController.getAll);

// GET /api/customers/:id — Get specific customer details
router.get('/:id', customerController.getById);

// DELETE /api/customers/:id — Delete a customer
router.delete('/:id', customerController.delete);

export default router;
