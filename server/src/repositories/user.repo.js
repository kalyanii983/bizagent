import { createRepository } from './base.repo.js';

export const userRepository = createRepository('users', {
  idPrefix: 'user',
  toPublic(user) {
    if (!user) return null;
    const { passwordHash, refreshTokenHash, ...safeUser } = user;
    return safeUser;
  },
});
