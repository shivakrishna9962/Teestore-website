import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import InventoryModel from '@/models/Inventory';
import NotificationModel from '@/models/Notification';
import UserModel from '@/models/User';

type RouteContext = { params: Promise<{ variantId: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
    try {
        const { variantId } = await context.params;

        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { stock } = await req.json();
        if (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock)) {
            return NextResponse.json({ error: 'stock must be a non-negative integer.' }, { status: 400 });
        }

        await connectToDatabase();

        const variant = await InventoryModel.findByIdAndUpdate(
            variantId,
            { stock, updatedAt: new Date() },
            { new: true }
        ).populate('product', 'title');

        if (!variant) {
            return NextResponse.json({ error: 'Variant not found.' }, { status: 404 });
        }

        // Trigger low-stock notification if stock fell below threshold
        if (stock < variant.lowStockThreshold) {
            const product = variant.product as any;
            const message = `Low stock alert: variant ${variant.size}/${variant.color} for product ${product?.title ?? variant.product} has ${stock} units remaining.`;

            const admins = await UserModel.find({ role: 'admin' }).select('_id').lean();
            const notifications = admins.map((admin) => ({
                user: admin._id,
                event: 'low_stock',
                message,
            }));
            if (notifications.length > 0) {
                await NotificationModel.insertMany(notifications);
            }
        }

        return NextResponse.json({ variant });
    } catch (err) {
        console.error('[PUT /api/inventory/[variantId]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
