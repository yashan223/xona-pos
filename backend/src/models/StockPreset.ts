import mongoose from 'mongoose';
const StockPresetSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    qty: { type: Number, required: true }
  }],
  createdBy: { type: String, required: true },
  createdAt: { type: String, required: true },
});
export const StockPresetModel = mongoose.model('StockPreset', StockPresetSchema);
export default StockPresetModel;
