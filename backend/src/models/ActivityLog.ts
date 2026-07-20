import mongoose from 'mongoose';
const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String },
  userId: { type: String }, 
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});
export const ActivityLogModel = mongoose.model('ActivityLog', activityLogSchema);
