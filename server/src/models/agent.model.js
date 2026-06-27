import { Schema, model } from './base.js';

const agentSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    agentId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, default: 'idle' },
    lastExecution: { type: Schema.Types.Mixed, default: null },
    logs: [{ type: Schema.Types.Mixed }],
    capabilities: [{ type: String }],
  },
  { timestamps: true }
);

export const AgentModel = model('Agent', agentSchema);
