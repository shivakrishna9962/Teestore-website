import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';

export async function PUT(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();

        const user = await UserModel.findByIdAndUpdate(
            id,
            { status: 'active' },
            { new: true }
        ).select('name email status role createdAt');

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (err) {
        console.error('[PUT /api/admin/users/[id]/reinstate]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
