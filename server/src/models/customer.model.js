import { Schema, model } from './base.js';

const customerSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    preferences: { type: Schema.Types.Mixed, default: {} },
    healthScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CustomerModel = model('Customer', customerSchema);
