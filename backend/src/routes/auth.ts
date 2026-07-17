import { Router } from 'express';
import authController from '../controllers/authController.js';

const router = Router();

// POST /api/auth/register — Register a new user
router.post('/register', authController.register);

// POST /api/auth/login — Login a user
router.post('/login', authController.login);

// GET /api/auth/users — Get all users
router.get('/users', authController.getAllUsers);

// DELETE /api/auth/users/:id — Delete a user
router.delete('/users/:id', authController.deleteUser);

// POST /api/auth/users/:id/role — Update a user's role
router.post('/users/:id/role', authController.updateUserRole);

export default router;
