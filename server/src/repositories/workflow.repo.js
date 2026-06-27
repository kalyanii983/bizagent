import { createMongoAwareRepository } from './mongo.repo.js';
import { WorkflowModel } from '../models/workflow.model.js';

export const workflowRepository = createMongoAwareRepository({
  storeName: 'workflows',
  model: WorkflowModel,
  idPrefix: 'workflow',
});
