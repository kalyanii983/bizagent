import { createMongoAwareRepository } from './mongo.repo.js';
import { NotificationModel } from '../models/notification.model.js';

export const notificationRepository = createMongoAwareRepository({
  storeName: 'notifications',
  model: NotificationModel,
  idPrefix: 'notification',
});
