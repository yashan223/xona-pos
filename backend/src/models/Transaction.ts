import mongoose from 'mongoose';
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
  paymentMethod: { type: String, enum: ['cash'], default: 'cash' },
  paymentStatus: { type: String, enum: ['paid', 'refunded', 'voided'], required: true },
  createdAt: { type: String, required: true },
});
export const TransactionModel = mongoose.model('Transaction', TransactionSchema);
