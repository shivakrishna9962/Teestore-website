import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import ConversationModel from '@/models/Conversation';
import MessageModel from '@/models/Message';
import UserModel from '@/models/User';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: conversationId } = await params;
        const userId = (session.user as any)?.id;
        const role = (session.user as any)?.role as 'user' | 'admin';

        const body = await req.json() as {
            text?: string;
            fileUrl?: string;
            fileName?: string;
            fileType?: 'image' | 'document';
        };

        const trimmedText = body.text?.trim() ?? '';
        if (!trimmedText && !body.fileUrl) {
            return NextResponse.json({ error: 'Message must have text or an attachment' }, { status: 400 });
        }
        if (trimmedText.length > 2000) {
            return NextResponse.json({ error: 'Message text exceeds 2000 characters' }, { status: 400 });
        }

        await connectToDatabase();

        const conversation = await ConversationModel.findById(conversationId).lean();
        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Auth check: users can only send to their own conversation
        if (role !== 'admin' && conversation.userId.toString() !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const message = await MessageModel.create({
            conversationId,
            senderId: userId,
            senderRole: role,
            text: trimmedText || null,
            attachmentUrl: body.fileUrl ?? null,
            attachmentName: body.fileName ?? null,
            attachmentType: body.fileType ?? null,
            read: false,
        });

        // Update conversation lastMessage and unread count
        const unreadField = role === 'user' ? 'adminUnreadCount' : 'userUnreadCount';
        const lastMessagePreview = trimmedText
            ? trimmedText.slice(0, 60)
            : body.fileName ?? 'Attachment';

        await ConversationModel.findByIdAndUpdate(conversationId, {
            lastMessage: lastMessagePreview,
            lastMessageAt: new Date(),
            $inc: { [unreadField]: 1 },
        });

        // Populate senderName
        const sender = await UserModel.findById(userId).select('name').lean() as any;
        const messageObj = message.toObject() as any;
        messageObj.senderName = sender?.name ?? null;

        return NextResponse.json({ message: messageObj }, { status: 201 });
    } catch (err) {
        console.error('[POST /api/chat/conversation/[id]/send]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
