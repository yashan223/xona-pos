import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  loyaltyPoints: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
});

export const CustomerModel = mongoose.model('Customer', CustomerSchema);
