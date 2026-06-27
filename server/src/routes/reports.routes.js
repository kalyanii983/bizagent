import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { reportRepository } from '../repositories/report.repo.js';
import { generateReportPdf } from '../services/pdf.service.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await reportRepository.list() });
});

router.post('/generate', requireAuth, async (req, res) => {
  const report = await reportRepository.create({ generatedBy: req.user.id, pdfUrl: null, ...req.body });
  report.pdfUrl = generateReportPdf(report);
  res.status(201).json(report);
});

router.get('/:id', requireAuth, async (req, res) => {
  const report = await reportRepository.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json(report);
});

export default router;
