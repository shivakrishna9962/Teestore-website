import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

        await connectToDatabase();
        const user = await UserModel.findOne({ email: email.toLowerCase() });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
        }

        const plainToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(plainToken, 10);
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await UserModel.findByIdAndUpdate(user._id, {
            resetToken: hashedToken,
            resetTokenExpiry: expiry,
        });

        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/confirm?token=${plainToken}&email=${encodeURIComponent(user.email)}`;

        await resend.emails.send({
            from: 'TeeStore <onboarding@resend.dev>',
            to: user.email,
            subject: 'Reset your TeeStore password',
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
                    <h2 style="color:#111;">Reset your password</h2>
                    <p style="color:#555;">Click the button below to reset your password. This link expires in 1 hour.</p>
                    <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
                        Reset Password
                    </a>
                    <p style="color:#999;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `,
        });

        return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('[reset-password]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
