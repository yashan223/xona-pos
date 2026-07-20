import mongoose from 'mongoose';
import { hashPassword } from '../lib/crypto.js';
import { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel, SavedReportModel, StockPresetModel } from '../models/index.js';
import db from './sqliteDb.js';
import { startAutoSync, pullCloudToLocal } from './syncEngine.js';
mongoose.set('bufferCommands', false);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona-pos';
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('[Database] Connected to Cloud MongoDB at ' + MONGO_URI);
  })
  .catch((err) => {
    console.warn('[Database] Cloud MongoDB unavailable on startup. Operating in Local SQLite Offline Mode:', err.message);
  });
export { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel, SavedReportModel, StockPresetModel };
async function initAdmin() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminUsername || !adminPassword) {
      return;
    }
    const adminPwHash = hashPassword(adminPassword);
    const adminId = 'admin-user-id';
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO local_users (id, username, passwordHash, email, role, createdAt)
      VALUES (?, ?, ?, 'admin@xona-pos.dev', 'admin', ?)
      ON CONFLICT(id) DO UPDATE SET passwordHash = excluded.passwordHash
    `).run(adminId, adminUsername, adminPwHash, now);
    if (mongoose.connection.readyState === 1) {
      const adminCheck = await UserModel.findOne({ username: adminUsername });
      if (!adminCheck) {
        await UserModel.create({
          _id: adminId,
          username: adminUsername,
          passwordHash: adminPwHash,
          email: 'admin@xona-pos.dev',
          createdAt: now,
          role: 'admin',
        });
        console.log(`[Database] Initialized default admin user in cloud: ${adminUsername}`);
      } else {
        await UserModel.updateOne(
          { username: adminUsername },
          { $set: { passwordHash: adminPwHash } }
        );
      }
    }
  } catch (err) {
    console.error('[Database] Admin initialization notice:', err);
  }
}
startAutoSync();
mongoose.connection.once('open', async () => {
  await initAdmin();
  await pullCloudToLocal();
});
export default mongoose;
