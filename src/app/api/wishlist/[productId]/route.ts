import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import WishlistModel from '@/models/Wishlist';

type RouteContext = { params: Promise<{ productId: string }> };

export async function DELETE(
    _req: NextRequest,
    context: RouteContext
) {
    try {
        const { productId } = await context.params;

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        await connectToDatabase();

        const mongoose = (await import('mongoose')).default;
        const productObjectId = new mongoose.Types.ObjectId(String(productId));

        const wishlist = await WishlistModel.findOneAndUpdate(
            { user: userId },
            {
                $pull: { products: productObjectId },
                $set: { updatedAt: new Date() },
            },
            { new: true, upsert: true }
        ).populate('products', 'title images price active');

        return NextResponse.json({ wishlist });
    } catch (err) {
        console.error('[DELETE /api/wishlist/[productId]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
