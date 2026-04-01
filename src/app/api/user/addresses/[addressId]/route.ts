import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';

type RouteContext = { params: Promise<{ addressId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { addressId } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await req.json();
        await connectToDatabase();
        const user = await UserModel.findById((session.user as any).id);
        if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

        const addr = user.addresses.id(addressId);
        if (!addr) return NextResponse.json({ error: 'Address not found.' }, { status: 404 });

        if (body.setDefault) {
            user.addresses.forEach((a: any) => { a.isDefault = false; });
            addr.isDefault = true;
        }
        // Allow updating fields
        const fields = ['fullName', 'addressLine1', 'addressLine2', 'city', 'postalCode', 'country'];
        fields.forEach((f) => { if (f in body) (addr as any)[f] = body[f]; });

        await user.save();
        return NextResponse.json({ addresses: user.addresses });
    } catch (err) {
        console.error('[PATCH /api/user/addresses/[addressId]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
    try {
        const { addressId } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await connectToDatabase();
        const user = await UserModel.findById((session.user as any).id);
        if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

        user.addresses = user.addresses.filter((a: any) => a._id.toString() !== addressId);
        // If deleted was default, make first remaining the default
        if (user.addresses.length > 0 && !user.addresses.some((a: any) => a.isDefault)) {
            user.addresses[0].isDefault = true;
        }
        await user.save();
        return NextResponse.json({ addresses: user.addresses });
    } catch (err) {
        console.error('[DELETE /api/user/addresses/[addressId]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
