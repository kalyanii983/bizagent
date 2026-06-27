import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';

const router = Router();

const pdfDir = path.resolve('server/storage/pdfs');

router.get('/pdfs/:filename', (req, res) => {
  const filePath = path.join(pdfDir, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'PDF not found' });
  }
  return res.sendFile(filePath);
});

export default router;
