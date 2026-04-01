import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import InventoryModel from '@/models/Inventory';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = req.nextUrl;
        const productId = searchParams.get('productId');

        // If filtering by productId, allow public access (needed for admin stock update flow)
        // Full inventory listing requires admin
        if (!productId) {
            const session = await getServerSession(authOptions);
            if (!session || (session.user as any)?.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const filter: Record<string, any> = {};
        if (productId) filter.product = productId;

        const variants = await InventoryModel.find(filter)
            .populate('product', 'title images price category')
            .lean();

        return NextResponse.json({ variants });
    } catch (err) {
        console.error('[GET /api/inventory]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
