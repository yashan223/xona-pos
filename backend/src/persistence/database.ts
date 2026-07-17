import mongoose from 'mongoose';
import { hashPassword } from '../lib/crypto.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona-pos';

mongoose.connect(MONGO_URI)
  .then(() => console.log('[Database] Connected to MongoDB at ' + MONGO_URI))
  .catch((err) => console.error('[Database] MongoDB connection error:', err));

// ─── Schemas ──────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: String, required: true },
  role: { type: String, default: 'cashier' }, // 'admin' | 'cashier'
});

const ProductSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  sku: { type: String, unique: true, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  cost: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  salesCount: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

const CustomerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  loyaltyPoints: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
});

const TransactionItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
}, { _id: false });

const TransactionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  cashierId: { type: String, required: true },
  customerId: { type: String, default: null },
  items: [TransactionItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'mobile'], required: true },
  paymentStatus: { type: String, enum: ['paid', 'refunded', 'voided'], required: true },
  createdAt: { type: String, required: true },
});

const GraphNodeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  type: { type: String, enum: ['product', 'category'], required: true },
  label: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
});

const GraphEdgeSchema = new mongoose.Schema({
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String, enum: ['BOUGHT_WITH', 'BELONGS_TO'], required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
});

// Compound index for unique edges to avoid duplicates
GraphEdgeSchema.index({ source: 1, target: 1, type: 1 }, { unique: true });

// ─── Models ───────────────────────────────────────────────

export const UserModel = mongoose.model('User', UserSchema);
export const ProductModel = mongoose.model('Product', ProductSchema);
export const CustomerModel = mongoose.model('Customer', CustomerSchema);
export const TransactionModel = mongoose.model('Transaction', TransactionSchema);
export const GraphNodeModel = mongoose.model('GraphNode', GraphNodeSchema);
export const GraphEdgeModel = mongoose.model('GraphEdge', GraphEdgeSchema);

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
