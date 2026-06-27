import fs from 'node:fs';
import path from 'node:path';

export function ensurePdfDirectory(baseDir) {
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

export function sanitizePdfFilename(name) {
  return `${name}`.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'document';
}

export function buildPdfPath(baseDir, filename) {
  return path.join(baseDir, `${sanitizePdfFilename(filename)}.pdf`);
}
