import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ticketRepository } from '../repositories/ticket.repo.js';
import { notificationRepository } from '../repositories/notification.repo.js';
import { emitSystemEvent } from '../services/event-bus.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await ticketRepository.list() });
});

router.post('/', requireAuth, async (req, res) => {
  const ticket = await ticketRepository.create({ status: 'open', ...req.body });

  if (ticket.priority === 'critical') {
    try {
      await notificationRepository.create({
        type: 'new_ticket',
        title: 'CRITICAL Support Ticket',
        message: `A critical ticket has been filed: ${ticket.issue}`,
        read: false,
        metadata: { ticketId: ticket.id }
      });
    } catch (err) {
      console.error('Failed to generate critical ticket notification:', err);
    }
  }

  emitSystemEvent('new_ticket', ticket);

  res.status(201).json(ticket);
});

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await ticketRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Ticket not found' });
  }
  const updated = await ticketRepository.update(req.params.id, req.body);
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const removed = await ticketRepository.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Ticket not found' });
  }
  res.status(204).send();
});

export default router;
