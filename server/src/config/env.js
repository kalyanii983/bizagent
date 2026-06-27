import fs from 'node:fs';

function read(value, fallback = '') {
  return value && `${value}`.trim() ? value : fallback;
}

export const env = {
  nodeEnv: read(process.env.NODE_ENV, 'development'),
  port: Number(process.env.PORT || 4000),
  clientOrigin: read(process.env.CLIENT_ORIGIN, 'http://localhost:5173'),
  mongoUri: read(process.env.MONGODB_URI),
  redisUrl: read(process.env.REDIS_URL),
  jwtAccessSecret: read(process.env.JWT_ACCESS_SECRET, 'dev-access-secret'),
  jwtRefreshSecret: read(process.env.JWT_REFRESH_SECRET, 'dev-refresh-secret'),
  accessTokenExpiresIn: read(process.env.ACCESS_TOKEN_EXPIRES_IN, '15m'),
  refreshTokenExpiresIn: read(process.env.REFRESH_TOKEN_EXPIRES_IN, '7d'),
  pdfBaseUrl: read(process.env.PDF_BASE_URL, '/pdfs'),
  emailFrom: read(process.env.EMAIL_FROM, 'no-reply@nxtbiz.local'),
  isProduction: read(process.env.NODE_ENV, 'development') === 'production',
};

export function ensureStorageDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
