import { Router } from 'express';
import { userRepository } from '../repositories/user.repo.js';
import { createAuthSession, hashPassword, comparePassword, verifyStoredRefreshToken, refreshAuthSession } from '../services/auth.js';
import { setAuthCookies, clearAuthCookies } from '../services/cookies.js';
import { AUTH_COOKIE_NAMES } from '../config/constants.js';
import { verifyAccessToken } from '../services/tokens.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { name, email, password, role = 'Viewer' } = req.body;
  
  const existingUser = userRepository.findOne((item) => item.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'Already registered, please login.' });
  }

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return res.status(400).json({ message: 'Password must contain a combination of letters and numbers.' });
  }
  const passwordHash = await hashPassword(password);
  const user = userRepository.create({ name, email, passwordHash, role, active: true, lastLoginAt: null });
  const session = await createAuthSession(user);
  user.refreshTokenHash = session.refreshTokenHash;
  setAuthCookies(res, session);
  res.status(201).json({ user: userRepository.publicItem(user), accessToken: session.accessToken });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = userRepository.findOne((item) => item.email === email);
  if (!user || !user.active || !(await comparePassword(password || '', user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const session = await createAuthSession(user);
  user.refreshTokenHash = session.refreshTokenHash;
  user.lastLoginAt = new Date().toISOString();
  setAuthCookies(res, session);
  return res.json({ user: userRepository.publicItem(user), accessToken: session.accessToken });
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.[AUTH_COOKIE_NAMES.REFRESH] || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }
  const sessionUser = userRepository.findOne((item) => item.refreshTokenHash);
  if (!sessionUser || !(await verifyStoredRefreshToken(refreshToken, sessionUser.refreshTokenHash))) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
  const session = await refreshAuthSession(sessionUser);
  sessionUser.refreshTokenHash = session.refreshTokenHash;
  setAuthCookies(res, session);
  return res.json({ user: userRepository.publicItem(sessionUser), accessToken: session.accessToken });
});

router.post('/logout', (_req, res) => {
  clearAuthCookies(res);
  return res.json({ message: 'Logged out' });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer || req.cookies?.[AUTH_COOKIE_NAMES.ACCESS];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = userRepository.findOne((item) => item.id === payload.sub);
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  return res.json({ user: userRepository.publicItem(user) });
});

export default router;
