import mongoose, { Schema, model, models } from 'mongoose';

const InvoiceSchema = new Schema({
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true }, // e.g. "INV-000042"
    pdfUrl: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
});

const InvoiceModel = models.Invoice || model('Invoice', InvoiceSchema);
export default InvoiceModel;
