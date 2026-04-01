import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import CartModel from '@/models/Cart';

async function getPopulatedCart(userId: string) {
    const cart = await CartModel.findOne({ user: userId })
        .populate('items.product', 'title images price')
        .lean();
    if (!cart) return null;
    return {
        ...cart,
        _id: (cart as any)._id?.toString(),
        items: ((cart as any).items ?? []).map((item: any) => ({
            ...item,
            _id: item._id?.toString(),
            product: item.product
                ? { ...item.product, _id: item.product._id?.toString() }
                : item.product,
        })),
    };
}

type RouteContext = { params: Promise<{ itemId: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
    try {
        const { itemId } = await context.params;

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        const { quantity } = await req.json();

        if (typeof quantity !== 'number') {
            return NextResponse.json({ error: 'quantity is required.' }, { status: 400 });
        }

        await connectToDatabase();

        const cart = await CartModel.findOne({ user: userId });
        if (!cart) {
            return NextResponse.json({ error: 'Cart not found.' }, { status: 404 });
        }

        const itemIndex = cart.items.findIndex(
            (item: any) => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        cart.updatedAt = new Date();
        await cart.save();

        const populated = await getPopulatedCart(userId);
        return NextResponse.json({ cart: populated });
    } catch (err) {
        console.error('[PUT /api/cart/[itemId]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
    try {
        const { itemId } = await context.params;

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        await connectToDatabase();

        const cart = await CartModel.findOne({ user: userId });
        if (!cart) {
            return NextResponse.json({ error: 'Cart not found.' }, { status: 404 });
        }

        const itemIndex = cart.items.findIndex(
            (item: any) => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
        }

        cart.items.splice(itemIndex, 1);
        cart.updatedAt = new Date();
        await cart.save();

        const populated = await getPopulatedCart(userId);
        return NextResponse.json({ cart: populated });
    } catch (err) {
        console.error('[DELETE /api/cart/[itemId]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
