import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notificationRepository } from '../repositories/notification.repo.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await notificationRepository.list() });
});

router.put('/:id', requireAuth, async (req, res) => {
  const notification = await notificationRepository.findById(req.params.id);
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  const updated = await notificationRepository.update(req.params.id, { read: Boolean(req.body.read) });
  res.json(updated);
});

export default router;
