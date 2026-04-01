import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import CartModel from '@/models/Cart';
import ProductModel from '@/models/Product';

async function getPopulatedCart(userId: string) {
    const cart = await CartModel.findOne({ user: userId })
        .populate('items.product', 'title images price')
        .lean();
    if (!cart) return null;
    // Normalize: serialize ObjectIds to strings
    return {
        ...cart,
        _id: cart._id?.toString(),
        items: (cart.items ?? []).map((item: any) => ({
            ...item,
            _id: item._id?.toString(),
            product: item.product
                ? { ...item.product, _id: item.product._id?.toString() }
                : item.product,
        })),
    };
}

export async function GET(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        await connectToDatabase();

        const cart = await getPopulatedCart(userId);
        return NextResponse.json({ cart: cart ?? { user: userId, items: [], discountAmount: 0 } });
    } catch (err) {
        console.error('[GET /api/cart]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        const { productId, size, color, quantity = 1 } = await req.json();

        if (!productId || !size || !color) {
            return NextResponse.json({ error: 'productId, size, and color are required.' }, { status: 400 });
        }

        await connectToDatabase();

        const product = await ProductModel.findById(productId).lean();
        if (!product) {
            return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
        }

        let cart = await CartModel.findOne({ user: userId });
        if (!cart) {
            cart = await CartModel.create({ user: userId, items: [], discountAmount: 0 });
        }

        const existingIndex = cart.items.findIndex(
            (item: any) =>
                item.product.toString() === productId &&
                item.size === size &&
                item.color === color
        );

        if (existingIndex >= 0) {
            cart.items[existingIndex].quantity += quantity;
        } else {
            cart.items.push({
                product: productId,
                size,
                color,
                quantity,
                unitPrice: (product as any).price,
            });
        }

        cart.updatedAt = new Date();
        await cart.save();

        const populated = await getPopulatedCart(userId);
        return NextResponse.json({ cart: populated });
    } catch (err) {
        console.error('[POST /api/cart]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
