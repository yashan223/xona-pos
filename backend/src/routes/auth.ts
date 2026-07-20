import { Router } from 'express';
import authController from '../controllers/authController.js';
const router = Router();
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', authController.getAllUsers);
router.delete('/users/:id', authController.deleteUser);
router.post('/users/:id/role', authController.updateUserRole);
router.put('/users/:id', authController.updateUser);
export default router;
