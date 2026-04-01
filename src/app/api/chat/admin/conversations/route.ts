import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import ConversationModel from '@/models/Conversation';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if ((session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();

        const conversations = await ConversationModel.find()
            .sort({ lastMessageAt: -1 })
            .populate('userId', '_id name email')
            .lean();

        const result = conversations.map((c: any) => ({
            ...c,
            user: c.userId,
        }));

        return NextResponse.json({ conversations: result });
    } catch (err) {
        console.error('[GET /api/chat/admin/conversations]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
