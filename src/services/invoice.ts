import { connectToDatabase } from '@/lib/db';
import OrderModel from '@/models/Order';
import InvoiceModel from '@/models/Invoice';
import CounterModel from '@/models/Counter';

/**
 * Generates an invoice for the given order.
 * If pdf-lib / Cloudinary are not configured, creates a placeholder invoice document
 * and logs a warning. The placeholder URL can be replaced once pdf-lib is installed.
 */
export async function generateInvoice(orderId: string): Promise<string> {
    await connectToDatabase();

    // Check if invoice already exists (idempotent)
    const existing = await InvoiceModel.findOne({ order: orderId });
    if (existing) {
        return existing.pdfUrl;
    }

    const order = await OrderModel.findById(orderId).populate('user', 'name email').lean();
    if (!order) {
        throw new Error(`Order ${orderId} not found.`);
    }

    // Atomic counter increment for sequential invoice numbers
    const counter = await CounterModel.findByIdAndUpdate(
        'invoice',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    const invoiceNumber = `INV-${String(counter.seq).padStart(6, '0')}`;

    let pdfUrl: string;

    try {
        // Attempt to use pdf-lib if available
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const orderData = order as any;
        const user = orderData.user as any;

        // Header
        page.drawText('INVOICE', { x: 50, y: 780, size: 24, font: boldFont, color: rgb(0, 0, 0) });
        page.drawText(invoiceNumber, { x: 50, y: 750, size: 14, font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: 730, size: 12, font });

        // Shopper info
        page.drawText('Bill To:', { x: 50, y: 700, size: 12, font: boldFont });
        page.drawText(user?.name ?? 'Customer', { x: 50, y: 685, size: 12, font });
        page.drawText(user?.email ?? '', { x: 50, y: 670, size: 12, font });

        const addr = orderData.shippingAddress;
        if (addr) {
            page.drawText(addr.addressLine1 ?? '', { x: 50, y: 655, size: 12, font });
            page.drawText(`${addr.city ?? ''}, ${addr.postalCode ?? ''} ${addr.country ?? ''}`, { x: 50, y: 640, size: 12, font });
        }

        // Items table header
        let y = 600;
        page.drawText('Item', { x: 50, y, size: 11, font: boldFont });
        page.drawText('Qty', { x: 300, y, size: 11, font: boldFont });
        page.drawText('Unit Price', { x: 360, y, size: 11, font: boldFont });
        page.drawText('Total', { x: 460, y, size: 11, font: boldFont });
        y -= 5;
        page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0, 0, 0) });
        y -= 15;

        for (const item of orderData.items ?? []) {
            const label = `${item.title} (${item.size}/${item.color})`;
            page.drawText(label.substring(0, 40), { x: 50, y, size: 10, font });
            page.drawText(String(item.quantity), { x: 300, y, size: 10, font });
            page.drawText(`$${(item.unitPrice / 100).toFixed(2)}`, { x: 360, y, size: 10, font });
            page.drawText(`$${((item.unitPrice * item.quantity) / 100).toFixed(2)}`, { x: 460, y, size: 10, font });
            y -= 18;
        }

        // Totals
        y -= 10;
        page.drawLine({ start: { x: 350, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0, 0, 0) });
        y -= 15;
        page.drawText('Subtotal:', { x: 360, y, size: 11, font });
        page.drawText(`$${(orderData.subtotal / 100).toFixed(2)}`, { x: 460, y, size: 11, font });
        y -= 15;
        page.drawText('Taxes:', { x: 360, y, size: 11, font });
        page.drawText(`$${(orderData.taxes / 100).toFixed(2)}`, { x: 460, y, size: 11, font });
        y -= 15;
        page.drawText('Shipping:', { x: 360, y, size: 11, font });
        page.drawText(`$${(orderData.shippingCost / 100).toFixed(2)}`, { x: 460, y, size: 11, font });
        if (orderData.discountAmount > 0) {
            y -= 15;
            page.drawText('Discount:', { x: 360, y, size: 11, font });
            page.drawText(`-$${(orderData.discountAmount / 100).toFixed(2)}`, { x: 460, y, size: 11, font });
        }
        y -= 15;
        page.drawText('Total:', { x: 360, y, size: 12, font: boldFont });
        page.drawText(`$${(orderData.total / 100).toFixed(2)}`, { x: 460, y, size: 12, font: boldFont });

        const pdfBytes = await pdfDoc.save();
        const base64 = Buffer.from(pdfBytes).toString('base64');

        // Upload to Cloudinary
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const uploadResult = await cloudinary.uploader.upload(
            `data:application/pdf;base64,${base64}`,
            { folder: 'invoices', public_id: invoiceNumber, resource_type: 'raw' }
        );
        pdfUrl = uploadResult.secure_url;
    } catch (err: any) {
        // pdf-lib or cloudinary not installed — use placeholder
        console.warn(
            '[invoice service] pdf-lib/cloudinary not available, using placeholder URL.',
            err?.message
        );
        pdfUrl = `/api/invoices/${orderId}/placeholder`;
    }

    // Create Invoice document
    const invoice = await InvoiceModel.create({
        order: orderId,
        invoiceNumber,
        pdfUrl,
    });

    // Link invoice to order
    await OrderModel.findByIdAndUpdate(orderId, { invoiceId: invoice._id });

    return pdfUrl;
}
