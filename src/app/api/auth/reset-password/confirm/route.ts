import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';

export async function POST(req: NextRequest) {
    try {
        const { email, token, password } = await req.json();

        if (!email || !token || !password) {
            return NextResponse.json({ error: 'Email, token, and new password are required.' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        await connectToDatabase();
        const user = await UserModel.findOne({
            email: email.toLowerCase(),
            resetTokenExpiry: { $gt: new Date() },
        });

        if (!user || !user.resetToken) {
            return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
        }

        const isValid = await bcrypt.compare(token, user.resetToken);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
        }

        const hashed = await bcrypt.hash(password, 12);
        await UserModel.findByIdAndUpdate(user._id, {
            password: hashed,
            resetToken: undefined,
            resetTokenExpiry: undefined,
        });

        return NextResponse.json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error('[reset-password/confirm]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
