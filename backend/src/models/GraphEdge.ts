import mongoose from 'mongoose';

const GraphEdgeSchema = new mongoose.Schema({
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String, enum: ['BOUGHT_WITH', 'BELONGS_TO'], required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
});

// Compound index for unique edges to avoid duplicates
GraphEdgeSchema.index({ source: 1, target: 1, type: 1 }, { unique: true });

export const GraphEdgeModel = mongoose.model('GraphEdge', GraphEdgeSchema);
