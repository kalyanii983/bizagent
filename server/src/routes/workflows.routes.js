import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { executeWorkflow } from '../services/orchestrator.js';
import { workflowRepository } from '../repositories/workflow.repo.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await workflowRepository.list() });
});

router.post('/', requireAuth, async (req, res) => {
  const workflow = await workflowRepository.create({ enabled: true, logs: [], ...req.body });
  res.status(201).json(workflow);
});

router.post('/:id/execute', requireAuth, async (req, res) => {
  const workflow = await workflowRepository.findById(req.params.id);
  if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
  const result = executeWorkflow(workflow, req.body);
  await workflowRepository.update(req.params.id, { logs: workflow.logs });
  res.json(result);
});

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await workflowRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Workflow not found' });
  }
  const updated = await workflowRepository.update(req.params.id, req.body);
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const removed = await workflowRepository.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Workflow not found' });
  }
  res.status(204).send();
});

export default router;
