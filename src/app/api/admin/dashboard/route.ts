import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import OrderModel from '@/models/Order';
import UserModel from '@/models/User';

export async function GET(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Run all aggregations in parallel
        const [
            revenueResult,
            totalOrders,
            newShoppers,
            topProductsRaw,
            revenueByDayRaw,
            recentOrders,
        ] = await Promise.all([
            // Total revenue this month (non-cancelled)
            OrderModel.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfMonth },
                        status: { $ne: 'Cancelled' },
                    },
                },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),

            // Total orders this month
            OrderModel.countDocuments({ createdAt: { $gte: startOfMonth } }),

            // New shoppers this month
            UserModel.countDocuments({ createdAt: { $gte: startOfMonth }, role: 'user' }),

            // Top 5 products by quantity sold
            OrderModel.aggregate([
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        title: { $first: '$items.title' },
                        soldCount: { $sum: '$items.quantity' },
                    },
                },
                { $sort: { soldCount: -1 } },
                { $limit: 5 },
                { $project: { _id: 0, title: 1, soldCount: 1 } },
            ]),

            // Daily revenue for past 30 days
            OrderModel.aggregate([
                {
                    $match: {
                        createdAt: { $gte: thirtyDaysAgo },
                        status: { $ne: 'Cancelled' },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                        },
                        revenue: { $sum: '$total' },
                    },
                },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, date: '$_id', revenue: 1 } },
            ]),

            // 10 most recent orders with user info
            OrderModel.find({})
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .limit(10)
                .select('_id user total status createdAt')
                .lean(),
        ]);

        return NextResponse.json({
            totalRevenue: revenueResult[0]?.total ?? 0,
            totalOrders,
            newShoppers,
            topProducts: topProductsRaw,
            revenueByDay: revenueByDayRaw,
            recentOrders,
        });
    } catch (err) {
        console.error('[GET /api/admin/dashboard]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
