import { Schema, model } from './base.js';

const agentExecutionSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    agentId: { type: String, required: true },
    eventId: { type: String, default: null },
    status: { type: String, required: true },
    input: { type: Schema.Types.Mixed, default: {} },
    output: { type: Schema.Types.Mixed, default: {} },
    logs: [{ type: Schema.Types.Mixed }],
    startedAt: { type: String, default: '' },
    finishedAt: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

export const AgentExecutionModel = model('AgentExecution', agentExecutionSchema);
