import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { emailRepository } from '../repositories/email.repo.js';
import { classifyEmail } from '../utils/text.js';
import { enqueueOrchestration } from '../services/queue.js';
import { customerRepository } from '../repositories/customer.repo.js';
import { emitSystemEvent } from '../services/event-bus.js';

const router = Router();

router.post('/process', requireAuth, async (req, res) => {
  let { subject, body, sender, customerId } = req.body;

  if (!sender || !sender.trim()) {
    return res.status(400).json({ message: 'Sender is required' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sender)) {
    return res.status(400).json({ message: 'Invalid sender email format' });
  }
  if (!subject || !subject.trim()) {
    return res.status(400).json({ message: 'Subject is required' });
  }
  if (!body || !body.trim()) {
    return res.status(400).json({ message: 'Body is required' });
  }

  // Auto-detect customer based on sender email if customerId is not specified
  if (!customerId) {
    const matchedCustomer = await customerRepository.findOne((c) => c.email === sender);
    if (matchedCustomer) {
      customerId = matchedCustomer.id;
    }
  }

  const analysis = classifyEmail(`${subject} ${body}`);
  const stored = await emailRepository.create({
    processed: true,
    subject,
    body,
    sender,
    customerId: customerId || null,
    ...analysis,
  });

  const orchestration = await enqueueOrchestration({
    sender,
    subject,
    body,
    customerId: customerId || null,
    emailId: stored.id
  });

  emitSystemEvent('new_email', stored);

  res.status(201).json({ ...stored, orchestration });
});

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await emailRepository.list() });
});

router.get('/:id', requireAuth, async (req, res) => {
  const email = await emailRepository.findById(req.params.id);
  if (!email) {
    return res.status(404).json({ message: 'Email not found' });
  }
  res.json(email);
});

router.put('/:id', requireAuth, async (req, res) => {
  const { processed } = req.body;
  const existing = await emailRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Email not found' });
  }

  const updated = await emailRepository.update(req.params.id, { processed: Boolean(processed) });

  if (processed && !existing.processed) {
    await enqueueOrchestration({
      sender: existing.sender,
      subject: existing.subject,
      body: existing.body,
      customerId: existing.customerId || null,
      emailId: existing.id
    });
  }

  res.json(updated);
});

export default router;
