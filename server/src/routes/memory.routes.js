import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { memoryRepository } from '../repositories/memory.repo.js';

const router = Router();

router.get('/search', requireAuth, async (req, res) => {
  const query = `${req.query.q || ''}`.toLowerCase();
  const items = (await memoryRepository.list()).filter((entry) => JSON.stringify(entry).toLowerCase().includes(query));
  res.json({ items });
});

export default router;
