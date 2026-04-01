import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import WishlistModel from '@/models/Wishlist';

export async function GET(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        await connectToDatabase();

        const wishlist = await WishlistModel.findOne({ user: userId })
            .populate('products', 'title images price active')
            .lean();

        return NextResponse.json({ wishlist: wishlist ?? { user: userId, products: [] } });
    } catch (err) {
        console.error('[GET /api/wishlist]', err);
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
        const { productId } = await req.json();

        if (!productId) {
            return NextResponse.json({ error: 'productId is required.' }, { status: 400 });
        }

        await connectToDatabase();

        const mongoose = (await import('mongoose')).default;
        const productObjectId = new mongoose.Types.ObjectId(String(productId));

        const wishlist = await WishlistModel.findOneAndUpdate(
            { user: userId },
            {
                $addToSet: { products: productObjectId },
                $set: { updatedAt: new Date() },
            },
            { upsert: true, new: true }
        ).populate('products', 'title images price active');

        return NextResponse.json({ wishlist });
    } catch (err) {
        console.error('[POST /api/wishlist]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
