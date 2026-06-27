import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { enqueueOrchestration } from '../services/queue.js';
import { agentRepository } from '../repositories/agent.repo.js';
import { agentExecutionRepository } from '../repositories/agent-execution.repo.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await agentRepository.list() });
});

router.get('/executions', requireAuth, async (_req, res) => {
  res.json({ items: await agentExecutionRepository.list() });
});

router.post('/run', requireAuth, async (req, res) => {
  const result = await enqueueOrchestration(req.body);
  res.status(201).json(result);
});

export default router;
