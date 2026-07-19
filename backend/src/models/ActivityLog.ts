import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String },
  userId: { type: String }, // Can be extracted from x-user-id header
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export const ActivityLogModel = mongoose.model('ActivityLog', activityLogSchema);
