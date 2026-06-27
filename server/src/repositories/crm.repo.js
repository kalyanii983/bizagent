import { createMongoAwareRepository } from './mongo.repo.js';
import { CRMActivityModel } from '../models/crm-activity.model.js';

export const crmRepository = createMongoAwareRepository({
  storeName: 'crmActivities',
  model: CRMActivityModel,
  idPrefix: 'crm',
});
