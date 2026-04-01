import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import OrderModel from '@/models/Order';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
    _req: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        const isAdmin = (session.user as any)?.role === 'admin';

        await connectToDatabase();

        const order = await OrderModel.findById(id).lean();
        if (!order) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }

        if (!isAdmin && (order as any).user.toString() !== userId) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }

        return NextResponse.json({ order });
    } catch (err) {
        console.error('[GET /api/orders/[id]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
