import mongoose from 'mongoose';
import { hashPassword } from '../lib/crypto.js';
import { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel } from '../models/index.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona-pos';

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('[Database] Connected to MongoDB at ' + MONGO_URI))
  .catch((err) => {
    console.error('[Database] MongoDB connection error:', err);
    console.error('\n⚠️  [Database Warning] If this timeout persists, please verify:');
    console.error('   1. Your current public IP is whitelisted in MongoDB Atlas -> Security -> Network Access.');
    console.error('   2. Your DNS server supports SRV lookups (try switching your network DNS to Google DNS: 8.8.8.8).');
    console.error('   3. Your database username and password in backend/.env are correct.\n');
  });

// Re-export models for external usage in repositories
export { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel };

// ─── Database Initialization ──────────────────────────────

async function initAdmin() {
  try {
    const adminCheck = await UserModel.findOne({ username: 'admin' });
    if (!adminCheck) {
      const adminId = 'admin-user-id';
      const adminPwHash = hashPassword('admin123'); // Default password
      const now = new Date().toISOString();
      await UserModel.create({
        _id: adminId,
        username: 'admin',
        passwordHash: adminPwHash,
        email: 'admin@xona-pos.dev',
        createdAt: now,
        role: 'admin',
      });
      console.log('[Database] Seeded default admin user: admin / admin123');
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
