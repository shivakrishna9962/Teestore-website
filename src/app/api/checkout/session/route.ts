import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import CartModel from '@/models/Cart';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });

const SHIPPING_COST = 500; // cents
const TAX_RATE = 0.1;

export async function POST(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        await connectToDatabase();

        const cart = await CartModel.findOne({ user: userId }).lean();
        if (!cart || !(cart as any).items?.length) {
            return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
        }

        const cartData = cart as any;
        const subtotal = cartData.items.reduce(
            (sum: number, item: any) => sum + item.unitPrice * item.quantity,
            0
        );
        const taxes = Math.round(subtotal * TAX_RATE);
        const discountAmount = cartData.discountAmount ?? 0;
        const total = subtotal + taxes + SHIPPING_COST - discountAmount;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: total,
            currency: 'usd',
            metadata: { userId },
        });

        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error('[POST /api/checkout/session]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
