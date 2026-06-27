import { Schema, model } from './base.js';

const crmActivitySchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    customerId: { type: String, default: null },
    type: { type: String, required: true },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const CRMActivityModel = model('CRMActivity', crmActivitySchema);
