import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import NotificationModel from '@/models/Notification';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';

        await connectToDatabase();

        const filter: Record<string, unknown> = { user: userId };
        if (unreadOnly) filter.read = false;

        const notifications = await NotificationModel.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ notifications });
    } catch (err) {
        console.error('[GET /api/notifications]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function PUT(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        await connectToDatabase();

        const result = await NotificationModel.updateMany(
            { user: userId, read: false },
            { $set: { read: true } }
        );

        return NextResponse.json({ updated: result.modifiedCount });
    } catch (err) {
        console.error('[PUT /api/notifications]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
