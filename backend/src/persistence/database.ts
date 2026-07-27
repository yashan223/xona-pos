import mongoose from 'mongoose';
import { hashPassword } from '../lib/crypto.js';
import { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel, SavedReportModel, StockPresetModel } from '../models/index.js';

mongoose.set('bufferCommands', false);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona-pos';

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('[Database] Connected to MongoDB at ' + MONGO_URI);
  })
  .catch((err) => {
    console.warn('[Database] MongoDB connection warning:', err.message);
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
      console.log(`[Database] Initialized default admin user in MongoDB: ${adminUsername}`);
    } else {
      await UserModel.updateOne(
        { username: adminUsername },
        { $set: { passwordHash: adminPwHash } }
      );
    }
  } catch (err) {
    console.error('[Database] Admin initialization notice:', err);
  }
}

mongoose.connection.once('open', async () => {
  await initAdmin();
});

export default mongoose;
