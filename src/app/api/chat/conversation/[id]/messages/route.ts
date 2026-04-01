import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import ConversationModel from '@/models/Conversation';
import MessageModel from '@/models/Message';
import UserModel from '@/models/User';

export async function GET(
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

        await connectToDatabase();

        const conversation = await ConversationModel.findById(id).lean();
        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Users may only access their own conversation; admins may access any
        if (role !== 'admin' && conversation.userId.toString() !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const messages = await MessageModel.find({ conversationId: id })
            .sort({ createdAt: 1 })
            .lean();

        // Populate senderName from User collection
        const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))];
        const users = await UserModel.find({ _id: { $in: senderIds } })
            .select('_id name')
            .lean();
        const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));

        const populated = messages.map((m) => ({
            ...m,
            senderName: userMap[m.senderId.toString()] ?? null,
        }));

        return NextResponse.json({ messages: populated });
    } catch (err) {
        console.error('[GET /api/chat/conversation/[id]/messages]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
