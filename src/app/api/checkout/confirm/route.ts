import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import CartModel from '@/models/Cart';
import OrderModel from '@/models/Order';
import InventoryModel from '@/models/Inventory';
import NotificationModel from '@/models/Notification';
import InvoiceModel from '@/models/Invoice';
import CounterModel from '@/models/Counter';

const SHIPPING_COST = 500;
const TAX_RATE = 0.1;

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = (session.user as any)?.id;
        const { paymentIntentId, shippingAddress, deliveryMethod, buyNowItem } = await req.json();

        if (!shippingAddress || !deliveryMethod) {
            return NextResponse.json({ error: 'shippingAddress and deliveryMethod are required.' }, { status: 400 });
        }

        await connectToDatabase();

        let orderItems: any[];
        let subtotal: number;
        let cartDoc: any = null;

        if (buyNowItem) {
            const ProductModel = (await import('@/models/Product')).default;
            const product = await ProductModel.findById(buyNowItem.productId).lean() as any;
            if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
            const qty = buyNowItem.quantity ?? 1;
            const updated = await InventoryModel.findOneAndUpdate(
                { product: product._id, size: buyNowItem.size, color: buyNowItem.color, stock: { $gte: qty } },
                { $inc: { stock: -qty }, updatedAt: new Date() },
                { new: true }
            );
            if (!updated) return NextResponse.json({ error: 'Item is out of stock.' }, { status: 409 });
            orderItems = [{ product: product._id, title: product.title, size: buyNowItem.size, color: buyNowItem.color, quantity: qty, unitPrice: product.price }];
            subtotal = product.price * qty;
        } else {
            cartDoc = await CartModel.findOne({ user: userId }).populate('items.product');
            if (!cartDoc || !cartDoc.items?.length) return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
            for (const item of cartDoc.items as any[]) {
                const updated = await InventoryModel.findOneAndUpdate(
                    { product: item.product._id, size: item.size, color: item.color, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity }, updatedAt: new Date() },
                    { new: true }
                );
                if (!updated) return NextResponse.json({ error: 'One or more items are out of stock.' }, { status: 409 });
            }
            orderItems = cartDoc.items.map((item: any) => ({
                product: item.product._id,
                title: item.product.title,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            }));
            subtotal = cartDoc.items.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0);
        }

        const taxes = Math.round(subtotal * TAX_RATE);
        const discountAmount = cartDoc ? (cartDoc.discountAmount ?? 0) : 0;
        const total = subtotal + taxes + SHIPPING_COST - discountAmount;

        const order = await OrderModel.create({
            user: userId,
            items: orderItems,
            shippingAddress,
            deliveryMethod,
            subtotal,
            taxes,
            shippingCost: SHIPPING_COST,
            discountAmount,
            total,
            paymentIntentId: paymentIntentId ?? 'mock',
            status: 'Confirmed',
            statusHistory: [{ status: 'Confirmed', timestamp: new Date() }],
        });

        if (cartDoc) {
            cartDoc.items = [];
            cartDoc.discountCode = undefined;
            cartDoc.discountAmount = 0;
            cartDoc.updatedAt = new Date();
            await cartDoc.save();
        }

        await NotificationModel.create({
            user: userId,
            event: 'order_confirmed',
            message: `Your order #${order._id} has been confirmed.`,
        });

        try {
            const counter = await CounterModel.findByIdAndUpdate('invoice', { $inc: { seq: 1 } }, { new: true, upsert: true });
            const invoiceNumber = `INV-${String(counter.seq).padStart(6, '0')}`;
            const invoice = await InvoiceModel.create({ order: order._id, invoiceNumber, pdfUrl: `/api/invoices/${order._id}/placeholder` });
            order.invoiceId = invoice._id;
            await order.save();
        } catch (invoiceErr) {
            console.warn('[checkout/confirm] Invoice creation failed:', invoiceErr);
        }

        return NextResponse.json({ orderId: order._id });
    } catch (err) {
        console.error('[POST /api/checkout/confirm]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
