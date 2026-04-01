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

        const conversation = await ConversationModel.findOneAndUpdate(
            { userId },
            { $setOnInsert: { userId } },
            { upsert: true, new: true }
        ).lean();

        return NextResponse.json({ conversation });
    } catch (err) {
        console.error('[GET /api/chat/conversation]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
