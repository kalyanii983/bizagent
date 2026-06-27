import { createMongoAwareRepository } from './mongo.repo.js';
import { CustomerModel } from '../models/customer.model.js';

export const customerRepository = createMongoAwareRepository({
  storeName: 'customers',
  model: CustomerModel,
  idPrefix: 'customer',
});
