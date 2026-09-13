import mongoose from 'mongoose';

if (mongoose.models.Question) delete mongoose.models.Question;

export const QuestionSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide the question name.'] },
  topic: { type: String, required: [true, 'Please specify the topic.'] },
  difficulty: { type: String, default: 'JEE Mains' },
  time: { type: String },
  attempts: { type: Number, default: 1 },
  summary: { type: String, required: [true, 'Please provide a summary.'] },
  solutionImage: { type: String },
  aiSolutionLocalPath: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);
