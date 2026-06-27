import { createMongoAwareRepository } from './mongo.repo.js';
import { MeetingModel } from '../models/meeting.model.js';

export const meetingRepository = createMongoAwareRepository({
  storeName: 'meetings',
  model: MeetingModel,
  idPrefix: 'meeting',
});
