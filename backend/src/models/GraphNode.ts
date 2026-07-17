import mongoose from 'mongoose';

const GraphNodeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  type: { type: String, enum: ['product', 'category'], required: true },
  label: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
});

export const GraphNodeModel = mongoose.model('GraphNode', GraphNodeSchema);
