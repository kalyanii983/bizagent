import { createMongoAwareRepository } from './mongo.repo.js';
import { AgentExecutionModel } from '../models/agent-execution.model.js';

export const agentExecutionRepository = createMongoAwareRepository({
  storeName: 'agentExecutions',
  model: AgentExecutionModel,
  idPrefix: 'execution',
});
