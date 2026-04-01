import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import CartModel from '@/models/Cart';
import DiscountCodeModel from '@/models/DiscountCode';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'code is required.' }, { status: 400 });
        }

        await connectToDatabase();

        const discount = await DiscountCodeModel.findOne({
            code: { $regex: new RegExp(`^${code}$`, 'i') },
            active: true,
        });

        if (!discount) {
            return NextResponse.json({ error: 'Invalid or inactive discount code.' }, { status: 400 });
        }

        if (discount.expiresAt && discount.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Discount code has expired.' }, { status: 400 });
        }

        if (discount.usageLimit != null && discount.usageCount >= discount.usageLimit) {
            return NextResponse.json({ error: 'Discount code usage limit reached.' }, { status: 400 });
        }

        // Compute discount amount based on cart subtotal
        const cart = await CartModel.findOne({ user: userId });
        if (!cart) {
            return NextResponse.json({ error: 'Cart not found.' }, { status: 404 });
        }

        const subtotal = cart.items.reduce(
            (sum: number, item: any) => sum + item.unitPrice * item.quantity,
            0
        );

        let discountAmount = 0;
        if (discount.type === 'percentage') {
            discountAmount = Math.round((subtotal * discount.value) / 100);
        } else {
            discountAmount = discount.value;
        }

        cart.discountCode = discount.code;
        cart.discountAmount = discountAmount;
        cart.updatedAt = new Date();
        await cart.save();

        return NextResponse.json({
            discountAmount,
            message: `Discount applied: ${discount.type === 'percentage' ? `${discount.value}% off` : `$${(discount.value / 100).toFixed(2)} off`}`,
        });
    } catch (err) {
        console.error('[POST /api/cart/discount]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
