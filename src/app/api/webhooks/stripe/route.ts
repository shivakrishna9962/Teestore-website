import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import CartModel from '@/models/Cart';
import OrderModel from '@/models/Order';
import InventoryModel from '@/models/Inventory';
import NotificationModel from '@/models/Notification';
import InvoiceModel from '@/models/Invoice';
import CounterModel from '@/models/Counter';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });

const SHIPPING_COST = 500;
const TAX_RATE = 0.1;

export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
        return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error('[stripe webhook] signature verification failed:', err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const userId = paymentIntent.metadata?.userId;

        if (!userId) {
            console.warn('[stripe webhook] payment_intent.succeeded missing userId metadata');
            return NextResponse.json({ received: true });
        }

        try {
            await connectToDatabase();

            // Idempotency check — skip if order already exists
            const existing = await OrderModel.findOne({ paymentIntentId: paymentIntent.id });
            if (existing) {
                return NextResponse.json({ received: true });
            }

            const cart = await CartModel.findOne({ user: userId }).populate('items.product');
            if (!cart || !cart.items?.length) {
                return NextResponse.json({ received: true });
            }

            // Atomically decrement inventory
            for (const item of cart.items as any[]) {
                const updated = await InventoryModel.findOneAndUpdate(
                    {
                        product: item.product._id,
                        size: item.size,
                        color: item.color,
                        stock: { $gte: item.quantity },
                    },
                    { $inc: { stock: -item.quantity }, updatedAt: new Date() },
                    { new: true }
                );
                if (!updated) {
                    console.error('[stripe webhook] inventory decrement failed for item', item);
                    return NextResponse.json({ received: true });
                }
            }

            const subtotal = cart.items.reduce(
                (sum: number, item: any) => sum + item.unitPrice * item.quantity,
                0
            );
            const taxes = Math.round(subtotal * TAX_RATE);
            const discountAmount = (cart as any).discountAmount ?? 0;
            const total = subtotal + taxes + SHIPPING_COST - discountAmount;

            const order = await OrderModel.create({
                user: userId,
                items: cart.items.map((item: any) => ({
                    product: item.product._id,
                    title: item.product.title,
                    size: item.size,
                    color: item.color,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
                shippingAddress: { fullName: '', addressLine1: '', city: '', postalCode: '', country: '' },
                deliveryMethod: 'standard',
                subtotal,
                taxes,
                shippingCost: SHIPPING_COST,
                discountAmount,
                total,
                paymentIntentId: paymentIntent.id,
                status: 'Confirmed',
                statusHistory: [{ status: 'Confirmed', timestamp: new Date() }],
            });

            // Clear cart
            cart.items = [];
            (cart as any).discountCode = undefined;
            (cart as any).discountAmount = 0;
            (cart as any).updatedAt = new Date();
            await cart.save();

            // Notification
            await NotificationModel.create({
                user: userId,
                event: 'order_confirmed',
                message: `Your order #${order._id} has been confirmed.`,
            });

            // Placeholder invoice
            try {
                const counter = await CounterModel.findByIdAndUpdate(
                    'invoice',
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );
                const invoiceNumber = `INV-${String(counter.seq).padStart(6, '0')}`;
                const invoice = await InvoiceModel.create({
                    order: order._id,
                    invoiceNumber,
                    pdfUrl: `/api/invoices/${order._id}/placeholder`,
                });
                order.invoiceId = invoice._id;
                await order.save();
            } catch (invoiceErr) {
                console.warn('[stripe webhook] invoice creation failed:', invoiceErr);
            }
        } catch (err) {
            console.error('[stripe webhook] error processing payment_intent.succeeded:', err);
        }
    }

    return NextResponse.json({ received: true });
}
