import mongoose from 'mongoose';
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
  lastStockUpdatedBy: { type: String, default: null },
  lastStockUpdatedAt: { type: String, default: null },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});
export const ProductModel = mongoose.model('Product', ProductSchema);
