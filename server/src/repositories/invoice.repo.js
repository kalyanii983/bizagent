import { createMongoAwareRepository } from './mongo.repo.js';
import { InvoiceModel } from '../models/invoice.model.js';

export const invoiceRepository = createMongoAwareRepository({
  storeName: 'invoices',
  model: InvoiceModel,
  idPrefix: 'invoice',
});
