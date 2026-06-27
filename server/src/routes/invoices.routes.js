import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { invoiceRepository } from '../repositories/invoice.repo.js';
import { generateInvoicePdf } from '../services/pdf.service.js';
import { emitSystemEvent } from '../services/event-bus.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json({ items: await invoiceRepository.list() });
});

router.post('/', requireAuth, async (req, res) => {
  const invoice = await invoiceRepository.create({ status: 'draft', pdfUrl: null, ...req.body });
  invoice.pdfUrl = generateInvoicePdf(invoice);
  emitSystemEvent('new_invoice', invoice);
  res.status(201).json(invoice);
});

router.get('/:id', requireAuth, async (req, res) => {
  const invoice = await invoiceRepository.findById(req.params.id);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json(invoice);
});

router.get('/:id/download', requireAuth, async (req, res) => {
  const invoice = await invoiceRepository.findById(req.params.id);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (!invoice.pdfUrl) {
    invoice.pdfUrl = generateInvoicePdf(invoice);
  }
  return res.json({ pdfUrl: invoice.pdfUrl });
});

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await invoiceRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  const updated = await invoiceRepository.update(req.params.id, req.body);

  updated.pdfUrl = generateInvoicePdf(updated);
  await invoiceRepository.update(req.params.id, { pdfUrl: updated.pdfUrl });

  res.json(updated);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const removed = await invoiceRepository.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Invoice not found' });
  }
  res.status(204).send();
});

export default router;
