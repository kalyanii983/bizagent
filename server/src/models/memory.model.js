import { Schema, model } from './base.js';

const memorySchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    scope: { type: String, default: 'global' },
    customerId: { type: String, default: null },
    agentId: { type: String, default: null },
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: {} },
    tags: [{ type: String }],
    source: { type: String, default: '' },
  },
  { timestamps: true }
);

export const MemoryModel = model('Memory', memorySchema);
