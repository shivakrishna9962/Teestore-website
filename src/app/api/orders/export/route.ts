import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import OrderModel from '@/models/Order';

function escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = req.nextUrl;
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const search = searchParams.get('search');

        await connectToDatabase();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: Record<string, any> = {};
        if (status) filter.status = status;
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        let orders = await OrderModel.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        if (search) {
            const lowerSearch = search.toLowerCase();
            orders = orders.filter((o: any) => {
                const user = o.user as any;
                return (
                    user?.name?.toLowerCase().includes(lowerSearch) ||
                    user?.email?.toLowerCase().includes(lowerSearch)
                );
            });
        }

        const headers = ['Order ID', 'Shopper Name', 'Shopper Email', 'Date', 'Items', 'Total (dollars)', 'Status'];
        const rows = orders.map((o: any) => {
            const user = o.user as any;
            const itemCount = o.items?.length ?? 0;
            const totalDollars = ((o.total ?? 0) / 100).toFixed(2);
            const date = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '';
            return [
                escapeCsv(o._id.toString()),
                escapeCsv(user?.name ?? ''),
                escapeCsv(user?.email ?? ''),
                escapeCsv(date),
                escapeCsv(String(itemCount)),
                escapeCsv(totalDollars),
                escapeCsv(o.status ?? ''),
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="orders.csv"',
            },
        });
    } catch (err) {
        console.error('[GET /api/orders/export]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
