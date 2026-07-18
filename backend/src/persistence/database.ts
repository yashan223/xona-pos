import mongoose from 'mongoose';
import { hashPassword } from '../lib/crypto.js';
import { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel, SavedReportModel } from '../models/index.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona-pos';

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('[Database] Connected to MongoDB at ' + MONGO_URI))
  .catch((err) => {
    console.error('[Database] MongoDB connection error:', err);
  });

// Re-export models for external usage in repositories
export { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel, SavedReportModel };

// ─── Database Initialization ──────────────────────────────

async function initAdmin() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.log('[Database Info] ADMIN_USERNAME or ADMIN_PASSWORD not specified in environment. Admin seeding skipped.');
      return;
    }

    const adminCheck = await UserModel.findOne({ username: adminUsername });
    const adminPwHash = hashPassword(adminPassword); // Sync admin password
    if (!adminCheck) {
      const adminId = 'admin-user-id';
      const now = new Date().toISOString();
      await UserModel.create({
        _id: adminId,
        username: adminUsername,
        passwordHash: adminPwHash,
        email: 'admin@xona-pos.dev',
        createdAt: now,
        role: 'admin',
      });
      console.log(`[Database] Seeded default admin user: ${adminUsername}`);
    } else {
      await UserModel.updateOne(
        { username: adminUsername },
        { $set: { passwordHash: adminPwHash } }
      );
      console.log(`[Database] Synced admin user password: ${adminUsername}`);
    }
  } catch (err) {
    console.error('[Database] Failed to seed admin user:', err);
  }
}

// Perform seed in background once connection is ready
mongoose.connection.once('open', () => {
  initAdmin();
});

export default mongoose;
