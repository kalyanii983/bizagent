import { createMongoAwareRepository } from './mongo.repo.js';
import { EmailModel } from '../models/email.model.js';

export const emailRepository = createMongoAwareRepository({
  storeName: 'emails',
  model: EmailModel,
  idPrefix: 'email',
});
