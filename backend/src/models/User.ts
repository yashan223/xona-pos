import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: String, required: true },
  role: { type: String, default: 'cashier' }, 
});
export const UserModel = mongoose.model('User', UserSchema);
