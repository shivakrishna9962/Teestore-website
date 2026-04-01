import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';
import NotificationModel from '@/models/Notification';

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        await connectToDatabase();

        const existing = await UserModel.findOne({ email: email.toLowerCase() });
        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await UserModel.create({
            name,
            email: email.toLowerCase(),
            password: hashed,
            role: 'user',
            status: 'active',
            marketingOptOut: false,
        });

        // Create in-app registration notification
        await NotificationModel.create({
            user: user._id,
            event: 'registration',
            message: `Welcome to TeeShop, ${name}! Your account has been created.`,
            read: false,
        });

        return NextResponse.json({ message: 'Account created successfully.' }, { status: 201 });
    } catch (err: any) {
        console.error('[register] ERROR:', err?.message || err);
        console.error('[register] STACK:', err?.stack);
        return NextResponse.json({ error: err?.message || 'Internal server error.' }, { status: 500 });
    }
}
