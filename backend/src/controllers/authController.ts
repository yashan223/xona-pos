import { Request, Response } from 'express';
import userRepository from '../repositories/userRepository.js';
import { hashPassword, verifyPassword } from '../lib/crypto.js';

class AuthController {
  private _generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  register = async (req: Request, res: Response) => {
    try {
      const { username, password, email, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check if user already exists
      const existing = await userRepository.getUserByUsername(trimmedUsername);
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      // Create user
      const id = this._generateId();
      const pwHash = hashPassword(password);
      const createdAt = new Date().toISOString();
      const chosenRole = role && ['admin', 'cashier', 'owner'].includes(role) ? role : 'cashier';

      const user = await userRepository.createUser(id, trimmedUsername, pwHash, email || '', createdAt, chosenRole);

      res.status(201).json({
        message: 'User registered successfully',
        user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt, role: user.role }
      });
    } catch (err) {
      console.error('[auth] Register error:', err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await userRepository.getUserByUsername(username.trim());
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          role: user.role
        }
      });
    } catch (err) {
      console.error('[auth] Login error:', err);
      res.status(500).json({ error: 'Failed to login' });
    }
  };

  getAllUsers = async (req: Request, res: Response) => {
    try {
      const users = await userRepository.getAllUsers();
      res.json(users);
    } catch (err) {
      console.error('[auth] GET users error:', err);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const success = await userRepository.deleteUser(id);
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error('[auth] deleteUser error:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  };

  updateUserRole = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { role } = req.body;
      if (role !== 'admin' && role !== 'cashier' && role !== 'owner') {
        return res.status(400).json({ error: 'Invalid role' });
      }
      const success = await userRepository.updateUserRole(id, role);
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User role updated successfully' });
    } catch (err) {
      console.error('[auth] updateUserRole error:', err);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  };

  updateUser = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { username, password, email, role } = req.body;

      const updateData: { username?: string; email?: string; passwordHash?: string; role?: string } = {};

      if (username) {
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) {
          return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        const existing = await userRepository.getUserByUsername(trimmedUsername);
        if (existing && existing.id !== id) {
          return res.status(400).json({ error: 'Username is already taken' });
        }
        updateData.username = trimmedUsername;
      }

      if (email !== undefined) {
        updateData.email = email;
      }

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        updateData.passwordHash = hashPassword(password);
      }

      if (role) {
        if (role !== 'admin' && role !== 'cashier' && role !== 'owner') {
          return res.status(400).json({ error: 'Invalid role' });
        }
        updateData.role = role;
      }

      const success = await userRepository.updateUser(id, updateData);
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User updated successfully' });
    } catch (err) {
      console.error('[auth] updateUser error:', err);
      res.status(500).json({ error: 'Failed to update user' });
    }
  };
}

export const authController = new AuthController();
export default authController;
