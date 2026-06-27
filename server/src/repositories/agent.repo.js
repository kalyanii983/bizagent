import { createMongoAwareRepository } from './mongo.repo.js';
import { AgentModel } from '../models/agent.model.js';

export const agentRepository = createMongoAwareRepository({
  storeName: 'agents',
  model: AgentModel,
  idPrefix: 'agent',
});
