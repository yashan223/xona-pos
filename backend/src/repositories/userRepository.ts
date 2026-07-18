import { UserModel } from '../persistence/database.js';
import db from '../persistence/sqliteDb.js';
import { isCloudOnline } from '../persistence/syncEngine.js';
import { User } from '../types/index.js';

class UserRepository {
  async createUser(id: string, username: string, passwordHash: string, email: string, createdAt: string, role: string = 'cashier'): Promise<User> {
    const online = isCloudOnline();

    // 1. Write to local SQLite first
    const insertStmt = db.prepare(`
      INSERT INTO local_users (id, username, passwordHash, email, role, synced, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(id, username, passwordHash, email || '', role, online ? 1 : 0, createdAt);

    // 2. Write to Cloud MongoDB if online
    if (online) {
      try {
        await UserModel.create({
          _id: id,
          username,
          passwordHash,
          email,
          createdAt,
          role,
        });
      } catch (err) {
        console.error('[userRepository] MongoDB create error (saved to SQLite):', err);
      }
    }

    return { id, username, email, createdAt, role };
  }

  async getUserByUsername(username: string): Promise<(User & { password_hash: string }) | null> {
    // 1. Query local SQLite
    try {
      const local = db.prepare('SELECT * FROM local_users WHERE LOWER(username) = LOWER(?)').get(username) as any;
      if (local) {
        return {
          id: local.id,
          username: local.username,
          password_hash: local.passwordHash,
          email: local.email || '',
          createdAt: local.createdAt,
          role: local.role || 'cashier',
        };
      }
    } catch (err) {
      console.warn('[userRepository] SQLite query failed:', err);
    }

    // 2. Fallback to Cloud MongoDB if online
    if (isCloudOnline()) {
      try {
        const doc = (await UserModel.findOne({ username }).lean()) as any;
        if (doc) {
          return {
            id: doc._id,
            username: doc.username,
            password_hash: doc.passwordHash,
            email: doc.email,
            createdAt: doc.createdAt,
            role: doc.role,
          };
        }
      } catch (err) {
        console.warn('[userRepository] MongoDB query failed:', err);
      }
    }

    return null;
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const locals = db.prepare('SELECT * FROM local_users ORDER BY username ASC').all() as any[];
      if (locals.length > 0) {
        return locals.map((l) => ({
          id: l.id,
          username: l.username,
          email: l.email || '',
          createdAt: l.createdAt,
          role: l.role || 'cashier',
        }));
      }
    } catch (err) {
      // ignore
    }

    if (isCloudOnline()) {
      try {
        const docs = await UserModel.find().sort({ username: 1 }).lean();
        return docs.map((doc: any) => ({
          id: doc._id,
          username: doc.username,
          email: doc.email,
          createdAt: doc.createdAt,
          role: doc.role,
        }));
      } catch (err) {
        // ignore
      }
    }

    return [];
  }

  async deleteUser(id: string): Promise<boolean> {
    const online = isCloudOnline();
    try {
      db.prepare('DELETE FROM local_users WHERE id = ?').run(id);
    } catch (err) {
      // ignore
    }

    if (online) {
      try {
        const res = await UserModel.deleteOne({ _id: id });
        return (res.deletedCount || 0) > 0;
      } catch (err) {
        // ignore
      }
    }

    return true;
  }

  async updateUserRole(id: string, role: string): Promise<boolean> {
    const online = isCloudOnline();
    try {
      db.prepare('UPDATE local_users SET role = ? WHERE id = ?').run(role, id);
    } catch (err) {
      // ignore
    }

    if (online) {
      try {
        await UserModel.updateOne({ _id: id }, { role });
      } catch (err) {
        // ignore
      }
    }

    return true;
  }

  async updateUser(id: string, updateData: { username?: string; email?: string; passwordHash?: string; role?: string }): Promise<boolean> {
    const online = isCloudOnline();
    try {
      if (updateData.username) db.prepare('UPDATE local_users SET username = ? WHERE id = ?').run(updateData.username, id);
      if (updateData.email !== undefined) db.prepare('UPDATE local_users SET email = ? WHERE id = ?').run(updateData.email, id);
      if (updateData.passwordHash) db.prepare('UPDATE local_users SET passwordHash = ? WHERE id = ?').run(updateData.passwordHash, id);
      if (updateData.role) db.prepare('UPDATE local_users SET role = ? WHERE id = ?').run(updateData.role, id);
    } catch (err) {
      // ignore
    }

    if (online) {
      try {
        await UserModel.updateOne({ _id: id }, { $set: updateData });
      } catch (err) {
        // ignore
      }
    }

    return true;
  }
}

export const userRepository = new UserRepository();
export default userRepository;
