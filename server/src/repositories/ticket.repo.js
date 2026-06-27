import { createMongoAwareRepository } from './mongo.repo.js';
import { TicketModel } from '../models/ticket.model.js';

export const ticketRepository = createMongoAwareRepository({
  storeName: 'tickets',
  model: TicketModel,
  idPrefix: 'ticket',
});
