import { Schema, model } from './base.js';

const emailSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    sender: { type: String, default: '' },
    customerId: { type: String, default: null },
    sentiment: { type: String, default: 'neutral' },
    intent: { type: String, default: 'general_inquiry' },
    urgency: { type: String, default: 'medium' },
    confidence: { type: Number, default: 0 },
    autoResponse: { type: String, default: '' },
    recommendations: [{ type: String }],
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const EmailModel = model('Email', emailSchema);
