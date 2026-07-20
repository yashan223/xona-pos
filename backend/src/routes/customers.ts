import { Router } from 'express';
import customerController from '../controllers/customerController.js';
const router = Router();
router.post('/', customerController.create);
router.get('/', customerController.getAll);
router.get('/:id', customerController.getById);
router.delete('/:id', customerController.delete);
export default router;
