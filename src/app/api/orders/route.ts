import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import OrderModel from '@/models/Order';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        const isAdmin = (session.user as any)?.role === 'admin';

        await connectToDatabase();

        if (isAdmin) {
            const { searchParams } = req.nextUrl;
            const status = searchParams.get('status');
            const dateFrom = searchParams.get('dateFrom');
            const dateTo = searchParams.get('dateTo');
            const search = searchParams.get('search');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filter: Record<string, any> = {};
            if (status) filter.status = status;
            if (dateFrom || dateTo) {
                filter.createdAt = {};
                if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
                if (dateTo) filter.createdAt.$lte = new Date(dateTo);
            }

            let orders;
            if (search) {
                // Search by user name/email via aggregation
                orders = await OrderModel.find(filter)
                    .populate('user', 'name email')
                    .sort({ createdAt: -1 })
                    .lean();

                const lowerSearch = search.toLowerCase();
                orders = orders.filter((o: any) => {
                    const user = o.user as any;
                    return (
                        user?.name?.toLowerCase().includes(lowerSearch) ||
                        user?.email?.toLowerCase().includes(lowerSearch)
                    );
                });
            } else {
                orders = await OrderModel.find(filter)
                    .populate('user', 'name email')
                    .sort({ createdAt: -1 })
                    .lean();
            }

            return NextResponse.json({ orders });
        } else {
            const orders = await OrderModel.find({ user: userId })
                .sort({ createdAt: -1 })
                .lean();
            return NextResponse.json({ orders });
        }
    } catch (err) {
        console.error('[GET /api/orders]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
