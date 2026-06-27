import { Schema, model } from './base.js';

const ticketSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    customerId: { type: String, default: null },
    priority: { type: String, default: 'medium' },
    issue: { type: String, default: '' },
    status: { type: String, default: 'open' },
    assignedTo: { type: String, default: null },
    resolution: { type: String, default: '' },
  },
  { timestamps: true }
);

export const TicketModel = model('Ticket', ticketSchema);
