import mongoose from 'mongoose';
const SavedReportSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  reportType: { type: String, enum: ['summary', 'category', 'daily'], required: true },
  filename: { type: String, required: true },
  filePath: { type: String, required: true },
  generatedBy: { type: String, required: true },
  createdAt: { type: String, required: true }
});
export const SavedReportModel = mongoose.model('SavedReport', SavedReportSchema);
export default SavedReportModel;
