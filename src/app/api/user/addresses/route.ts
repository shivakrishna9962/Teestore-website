import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await connectToDatabase();
        const user = await UserModel.findById((session.user as any).id).select('addresses').lean();
        return NextResponse.json({ addresses: (user as any)?.addresses ?? [] });
    } catch (err) {
        console.error('[GET /api/user/addresses]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await req.json();
        const { fullName, addressLine1, addressLine2, city, postalCode, country, setDefault } = body;
        if (!fullName || !addressLine1 || !city || !postalCode || !country) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }
        await connectToDatabase();
        const user = await UserModel.findById((session.user as any).id);
        if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

        // If setDefault or first address, clear existing defaults
        if (setDefault || user.addresses.length === 0) {
            user.addresses.forEach((a: any) => { a.isDefault = false; });
        }
        user.addresses.push({ fullName, addressLine1, addressLine2: addressLine2 ?? '', city, postalCode, country, isDefault: setDefault || user.addresses.length === 0 });
        await user.save();
        return NextResponse.json({ addresses: user.addresses });
    } catch (err) {
        console.error('[POST /api/user/addresses]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
