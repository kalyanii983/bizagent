import { createMongoAwareRepository } from './mongo.repo.js';
import { MemoryModel } from '../models/memory.model.js';

export const memoryRepository = createMongoAwareRepository({
  storeName: 'memory',
  model: MemoryModel,
  idPrefix: 'memory',
});
