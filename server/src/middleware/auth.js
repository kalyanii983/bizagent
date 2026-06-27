import { ROLES } from '../config/constants.js';
import { verifyAccessToken } from '../services/tokens.js';
import { AUTH_COOKIE_NAMES } from '../config/constants.js';
import { store } from '../data/store.js';

export function requireAuth(req, res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const token = bearer || req.cookies?.[AUTH_COOKIE_NAMES.ACCESS];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = store.users.find((item) => item.id === payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    req.user = { id: user.id, name: user.name, role: user.role, email: user.email };
  } catch {
    return res.status(401).json({ message: 'Authentication required' });
  }

  return next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
}
