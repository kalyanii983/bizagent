import { env } from '../config/env.js';
import { AUTH_COOKIE_NAMES } from '../config/constants.js';

function baseOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  if (accessToken) {
    res.cookie(AUTH_COOKIE_NAMES.ACCESS, accessToken, {
      ...baseOptions(),
      maxAge: 15 * 60 * 1000,
    });
  }
  if (refreshToken) {
    res.cookie(AUTH_COOKIE_NAMES.REFRESH, refreshToken, {
      ...baseOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}

export function clearAuthCookies(res) {
  res.clearCookie(AUTH_COOKIE_NAMES.ACCESS, baseOptions());
  res.clearCookie(AUTH_COOKIE_NAMES.REFRESH, baseOptions());
}
