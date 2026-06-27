import { Schema, model } from './base.js';

const reportSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    type: { type: String, default: 'weekly' },
    title: { type: String, required: true },
    metrics: { type: Schema.Types.Mixed, default: {} },
    recommendations: [{ type: String }],
    summary: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    generatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const ReportModel = model('Report', reportSchema);
