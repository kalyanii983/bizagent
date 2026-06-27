import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { crmRepository } from '../repositories/crm.repo.js';
import { createId } from '../utils/id.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await crmRepository.list() });
});

router.post('/note', requireAuth, async (req, res) => {
  const activity = await crmRepository.create({ id: createId('crm', []), type: 'note', ...req.body });
  res.status(201).json(activity);
});

router.post('/activity', requireAuth, async (req, res) => {
  const activity = await crmRepository.create({ id: createId('crm', []), type: 'activity', ...req.body });
  res.status(201).json(activity);
});

export default router;
