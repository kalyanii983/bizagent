import { Schema, model } from './base.js';

const workflowSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    trigger: { type: String, required: true },
    condition: { type: String, default: '' },
    action: { type: String, default: '' },
    steps: [{ type: String }],
    enabled: { type: Boolean, default: true },
    logs: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true }
);

export const WorkflowModel = model('Workflow', workflowSchema);
