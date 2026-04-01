import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/db';
import WishlistModel from '@/models/Wishlist';
import WishlistClient from './WishlistClient';

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login?callbackUrl=/wishlist');

    const userId = (session.user as any)?.id;
    await connectToDatabase();

    const wishlist = await WishlistModel.findOne({ user: userId })
        .populate('products', 'title images price sizes colors _id active')
        .lean() as any;

    const products = (wishlist?.products ?? [])
        .filter((p: any) => p != null)
        .map((p: any) => ({
            _id: p._id.toString(),
            title: p.title ?? 'Product',
            images: p.images ?? [],
            price: p.price ?? 0,
            sizes: p.sizes ?? [],
            colors: p.colors ?? [],
        }));

    return <WishlistClient initialProducts={products} />;
}