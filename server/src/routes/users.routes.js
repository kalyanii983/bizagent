import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { userRepository } from '../repositories/user.repo.js';
import { hashPassword } from '../services/auth.js';

const router = Router();

router.get('/', requireAuth, requireRole(ROLES.ADMIN, ROLES.MANAGER), async (_req, res) => {
  const users = await userRepository.list();
  res.json({ items: users.map(({ passwordHash, refreshTokenHash, ...user }) => user) });
});

router.post('/', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  const { name, email, password, role = 'Viewer' } = req.body;
  
  const existingUser = await userRepository.findOne((item) => item.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const passwordHash = await hashPassword(password || 'changeme123');
  const user = await userRepository.create({
    name,
    email,
    passwordHash,
    role,
    active: true,
    lastLoginAt: null,
  });
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json(safeUser);
});

router.put('/:id', requireAuth, requireRole(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
  const user = await userRepository.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const updated = await userRepository.update(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ message: 'User not found' });
  }
  const { passwordHash, ...safeUser } = updated;
  return res.json(safeUser);
});

router.delete('/:id', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }
  const removed = await userRepository.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.status(204).send();
});

export default router;
