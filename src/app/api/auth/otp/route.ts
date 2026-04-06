import { NextRequest, NextResponse } from 'next/server';
import { sendOtp, OtpPurpose } from '@/lib/otp';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
        }

        const { mobileNumber, purpose } = body as { mobileNumber?: unknown; purpose?: unknown };

        if (!mobileNumber || typeof mobileNumber !== 'string') {
            return NextResponse.json({ error: 'mobileNumber is required.' }, { status: 400 });
        }

        if (!purpose || (purpose !== 'register' && purpose !== 'login')) {
            return NextResponse.json({ error: 'purpose must be "register" or "login".' }, { status: 400 });
        }

        const result = await sendOtp(mobileNumber, purpose as OtpPurpose);

        if (result.ok) {
            return NextResponse.json({ retryAfter: result.retryAfter }, { status: 200 });
        }

        // Map error strings to HTTP status codes
        if (result.error === 'Invalid mobile number format.') {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        if (result.error === 'No account found for this number.') {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        if (result.error === 'Mobile number already in use.') {
            return NextResponse.json({ error: result.error }, { status: 409 });
        }

        if (result.retryAfter !== undefined) {
            return NextResponse.json(
                { error: result.error, retryAfter: result.retryAfter },
                { status: 429 }
            );
        }

        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[otp/send] UNCAUGHT ERROR:', message, err);

        // Distinguish Twilio auth/config errors from generic failures
        if (message.includes('authenticate') || message.includes('credentials') || message.includes('SID')) {
            return NextResponse.json(
                { error: 'SMS service configuration error. Please contact support.' },
                { status: 502 }
            );
        }

        return NextResponse.json(
            { error: `Failed to send SMS: ${message}` },
            { status: 502 }
        );
    }
}
