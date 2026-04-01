import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import OrderModel from '@/models/Order';
import { generateInvoice } from '@/services/invoice';

type InvoiceContext = { params: Promise<{ orderId: string }> };

export async function GET(
    _req: NextRequest,
    context: InvoiceContext
) {
    try {
        const { orderId } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        const isAdmin = (session.user as any)?.role === 'admin';

        await connectToDatabase();

        const order = await OrderModel.findById(orderId).lean();
        if (!order) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }
        if (!isAdmin && (order as any).user.toString() !== userId) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }

        let invoice = await InvoiceModel.findOne({ order: orderId }).lean();
        if (!invoice) {
            const pdfUrl = await generateInvoice(orderId);
            return NextResponse.redirect(pdfUrl);
        }

        return NextResponse.redirect((invoice as any).pdfUrl);
    } catch (err) {
        console.error('[GET /api/invoices/[orderId]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function POST(
    _req: NextRequest,
    context: InvoiceContext
) {
    try {
        const { orderId } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        const isAdmin = (session.user as any)?.role === 'admin';

        await connectToDatabase();

        const order = await OrderModel.findById(orderId).lean();
        if (!order) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }
        if (!isAdmin && (order as any).user.toString() !== userId) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }

        const pdfUrl = await generateInvoice(orderId);
        const invoice = await InvoiceModel.findOne({ order: orderId }).lean();

        return NextResponse.json({
            invoiceNumber: (invoice as any)?.invoiceNumber,
            pdfUrl,
        });
    } catch (err) {
        console.error('[POST /api/invoices/[orderId]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
