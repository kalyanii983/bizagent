import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { customerRepository } from '../repositories/customer.repo.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const items = await customerRepository.list();
  res.json({ items });
});

router.get('/:id', requireAuth, async (req, res) => {
  const customer = await customerRepository.findById(req.params.id);
  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }
  res.json(customer);
});

router.post('/', requireAuth, requireRole(ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), async (req, res) => {
  const { name, email, phone, company, tags, notes, preferences, healthScore } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ message: 'Email is required' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  const existingCustomer = await customerRepository.findOne((item) => item.email === email);
  if (existingCustomer) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  let healthVal = parseInt(healthScore);
  if (isNaN(healthVal)) healthVal = 0;
  if (healthVal < 0 || healthVal > 100) {
    return res.status(400).json({ message: 'Health score must be between 0 and 100' });
  }

  const customer = await customerRepository.create({
    name,
    email,
    phone: phone || '',
    company: company || '',
    tags: tags || [],
    notes: notes || '',
    preferences: preferences || {},
    healthScore: healthVal,
  });
  res.status(201).json(customer);
});

router.put('/:id', requireAuth, requireRole(ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), async (req, res) => {
  const { name, email, phone, company, tags, notes, preferences, healthScore } = req.body;
  const existing = await customerRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }
  if (email !== undefined && !email.trim()) {
    return res.status(400).json({ message: 'Email is required' });
  }
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    const dup = await customerRepository.findOne((item) => item.email === email && item.id !== req.params.id);
    if (dup) {
      return res.status(400).json({ message: 'Email already exists' });
    }
  }

  let updatePayload = { ...req.body };
  if (healthScore !== undefined) {
    let healthVal = parseInt(healthScore);
    if (isNaN(healthVal)) healthVal = 0;
    if (healthVal < 0 || healthVal > 100) {
      return res.status(400).json({ message: 'Health score must be between 0 and 100' });
    }
    updatePayload.healthScore = healthVal;
  }

  const updated = await customerRepository.update(req.params.id, updatePayload);
  res.json(updated);
});

router.delete('/:id', requireAuth, requireRole(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
  const removed = await customerRepository.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Customer not found' });
  }
  res.status(204).send();
});

export default router;
