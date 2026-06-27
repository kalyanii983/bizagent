import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { meetingRepository } from '../repositories/meeting.repo.js';
import { emitSystemEvent } from '../services/event-bus.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await meetingRepository.list() });
});

router.post('/', requireAuth, async (req, res) => {
  const meeting = await meetingRepository.create({ status: 'scheduled', ...req.body });
  emitSystemEvent('new_meeting', meeting);
  res.status(201).json(meeting);
});

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await meetingRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Meeting not found' });
  }
  const updated = await meetingRepository.update(req.params.id, req.body);
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const removed = await meetingRepository.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Meeting not found' });
  }
  res.status(204).send();
});

export default router;
