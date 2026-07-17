import { UserModel } from '../persistence/database.js';
import { User } from '../types/index.js';

class UserRepository {
  async createUser(id: string, username: string, passwordHash: string, email: string, createdAt: string, role: string = 'cashier'): Promise<User> {
    const doc = await UserModel.create({
      _id: id,
      username,
      passwordHash,
      email,
      createdAt,
      role,
    });
    return {
      id: doc._id,
      username: doc.username,
      email: doc.email,
      createdAt: doc.createdAt,
      role: doc.role,
    };
  }

  async getUserByUsername(username: string): Promise<(User & { password_hash: string }) | null> {
    const doc = await UserModel.findOne({ username }).lean() as any;
    if (!doc) return null;
    return {
      id: doc._id,
      username: doc.username,
      password_hash: doc.passwordHash,
      email: doc.email,
      createdAt: doc.createdAt,
      role: doc.role,
    };
  }

  async getAllUsers(): Promise<User[]> {
    const docs = await UserModel.find().sort({ username: 1 }).lean();
    return docs.map((doc: any) => ({
      id: doc._id,
      username: doc.username,
      email: doc.email,
      createdAt: doc.createdAt,
      role: doc.role,
    }));
  }

  async deleteUser(id: string): Promise<boolean> {
    const res = await UserModel.deleteOne({ _id: id });
    return (res.deletedCount || 0) > 0;
  }

  async updateUserRole(id: string, role: string): Promise<boolean> {
    const res = await UserModel.updateOne({ _id: id }, { role });
    return (res.modifiedCount || 0) > 0;
  }
}

export const userRepository = new UserRepository();
export default userRepository;
