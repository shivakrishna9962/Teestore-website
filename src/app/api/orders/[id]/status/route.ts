import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import OrderModel from '@/models/Order';
import NotificationModel from '@/models/Notification';

const STATUS_TRANSITIONS: Record<string, string> = {
    Confirmed: 'Processing',
    Processing: 'Shipped',
    Shipped: 'Out for Delivery',
    'Out for Delivery': 'Delivered',
};

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { status, trackingNumber, carrier, adminId } = await req.json();

        if (!status) {
            return NextResponse.json({ error: 'status is required.' }, { status: 400 });
        }

        await connectToDatabase();

        const order = await OrderModel.findById(id);
        if (!order) {
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }

        // Validate transition
        const expectedNext = STATUS_TRANSITIONS[order.status];
        if (expectedNext !== status) {
            return NextResponse.json(
                { error: `Invalid status transition from ${order.status} to ${status}.` },
                { status: 400 }
            );
        }

        // Require tracking info for Shipped
        if (status === 'Shipped') {
            if (!trackingNumber?.trim() || !carrier?.trim()) {
                return NextResponse.json(
                    { error: 'trackingNumber and carrier are required for Shipped status.' },
                    { status: 400 }
                );
            }
            order.trackingNumber = trackingNumber;
            order.carrier = carrier;
        }

        order.status = status;
        order.statusHistory.push({ status, timestamp: new Date(), adminId });
        await order.save();

        // Notify the shopper
        await NotificationModel.create({
            user: order.user,
            event: 'order_status_changed',
            message: `Your order #${order._id} status has been updated to ${status}.`,
        });

        return NextResponse.json({ order });
    } catch (err) {
        console.error('[PUT /api/orders/[id]/status]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
