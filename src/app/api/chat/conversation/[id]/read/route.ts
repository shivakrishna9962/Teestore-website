import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import ConversationModel from '@/models/Conversation';
import MessageModel from '@/models/Message';

export async function PUT(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const userId = (session.user as any)?.id;
        const role = (session.user as any)?.role;
        const isAdmin = role === 'admin';

        await connectToDatabase();

        const conversation = await ConversationModel.findById(id).lean();
        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Users may only access their own conversation; admins may access any
        if (!isAdmin && conversation.userId.toString() !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Mark as read all messages sent by the other party (not the caller)
        const callerRole = isAdmin ? 'admin' : 'user';
        await MessageModel.updateMany(
            { conversationId: id, senderRole: { $ne: callerRole }, read: false },
            { $set: { read: true } }
        );

        // Reset the unread count for the caller's side
        const unreadCountField = isAdmin ? 'adminUnreadCount' : 'userUnreadCount';
        await ConversationModel.findByIdAndUpdate(id, { $set: { [unreadCountField]: 0 } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[PUT /api/chat/conversation/[id]/read]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
