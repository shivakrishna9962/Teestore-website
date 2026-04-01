import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';
import OrderModel from '@/models/Order';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const search = req.nextUrl.searchParams.get('search');
        await connectToDatabase();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: Record<string, any> = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await UserModel.find(filter)
            .select('name email createdAt status role')
            .lean();

        // Aggregate order counts per user
        const userIds = users.map((u: any) => u._id);
        const orderCounts = await OrderModel.aggregate([
            { $match: { user: { $in: userIds } } },
            { $group: { _id: '$user', count: { $sum: 1 } } },
        ]);

        const countMap = new Map(orderCounts.map((o: any) => [o._id.toString(), o.count]));

        const result = users.map((u: any) => ({
            ...u,
            orderCount: countMap.get(u._id.toString()) ?? 0,
        }));

        return NextResponse.json({ users: result });
    } catch (err) {
        console.error('[GET /api/admin/users]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
