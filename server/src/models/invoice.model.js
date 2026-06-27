import { Schema, model } from './base.js';

const invoiceSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    customerId: { type: String, required: true },
    amount: { type: Number, default: 0 },
    dueDate: { type: String, default: '' },
    status: { type: String, default: 'draft' },
    pdfUrl: { type: String, default: '' },
    lineItems: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true }
);

export const InvoiceModel = model('Invoice', invoiceSchema);
