import { createMongoAwareRepository } from './mongo.repo.js';
import { ReportModel } from '../models/report.model.js';

export const reportRepository = createMongoAwareRepository({
  storeName: 'reports',
  model: ReportModel,
  idPrefix: 'report',
});
