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

        const userId = (session.user as any)?.id;
        await connectToDatabase();

        const conversation = await ConversationModel.findOne({ userId }).lean() as any;

        if (!conversation) {
            return NextResponse.json({ unreadCount: 0 });
        }

        return NextResponse.json({ unreadCount: conversation.userUnreadCount ?? 0 });
    } catch (err) {
        console.error('[GET /api/chat/unread]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
