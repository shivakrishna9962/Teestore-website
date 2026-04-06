import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';
import { sendOtp, verifyOtp, isValidE164 } from '@/lib/otp';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { mobileNumber, otp } = body;

        if (!mobileNumber || !isValidE164(mobileNumber)) {
            return NextResponse.json({ error: 'Invalid mobile number format.' }, { status: 400 });
        }

        await connectToDatabase();

        // Check if the number is already linked to a DIFFERENT account (Req 5.4)
        const existingUser = await UserModel.findOne({ mobileNumber });
        const currentUserId = (session.user as any).id;

        if (existingUser && existingUser._id.toString() !== currentUserId) {
            return NextResponse.json({ error: 'Mobile number already in use.' }, { status: 409 });
        }

        // Step 1: No OTP provided — send OTP (Req 5.1, 5.2)
        if (!otp) {
            const result = await sendOtp(mobileNumber, 'link');

            if (!result.ok) {
                if (result.retryAfter && !result.error?.includes('already')) {
                    return NextResponse.json(
                        { error: result.error, retryAfter: result.retryAfter },
                        { status: 429 }
                    );
                }
                return NextResponse.json({ error: result.error }, { status: 400 });
            }

            return NextResponse.json({ retryAfter: result.retryAfter });
        }

        // Step 2: OTP provided — verify and link (Req 5.2, 5.3)
        const verifyResult = await verifyOtp(mobileNumber, otp);

        if (!verifyResult.ok) {
            switch (verifyResult.error) {
                case 'not_found':
                    return NextResponse.json({ error: 'No pending OTP for this number.' }, { status: 404 });
                case 'expired':
                    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 401 });
                case 'max_attempts':
                    return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 401 });
                case 'invalid':
                default:
                    return NextResponse.json({ error: 'Incorrect code.' }, { status: 401 });
            }
        }

        // OTP verified — update the authenticated user's document with mobileNumber (Req 5.3)
        await UserModel.findByIdAndUpdate(currentUserId, { mobileNumber });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[POST /api/user/mobile]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
