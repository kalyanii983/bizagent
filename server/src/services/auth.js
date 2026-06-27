import { comparePassword, hashPassword, hashToken, compareToken } from './passwords.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens.js';

export async function createAuthSession(user) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id });
  const refreshTokenHash = await hashToken(refreshToken);

  return { accessToken, refreshToken, refreshTokenHash };
}

export async function verifyStoredRefreshToken(refreshToken, refreshTokenHash) {
  if (!refreshTokenHash) return false;
  const payload = verifyRefreshToken(refreshToken);
  return Boolean(payload?.sub) && (await compareToken(refreshToken, refreshTokenHash));
}

export { hashPassword, comparePassword, hashToken, compareToken };

export async function refreshAuthSession(user) {
  return createAuthSession(user);
}
