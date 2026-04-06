/**
 * OtpService — sends and verifies SMS OTPs via Twilio Verify.
 *
 * When Twilio Verify is configured (TWILIO_SERVICE_SID present), OTP generation
 * and validation is fully delegated to Twilio. Our DB only tracks cooldown
 * (otpLastSentAt) and pending-registration state.
 *
 * Requirements: 1.3, 1.5, 1.7, 1.8, 1.9, 2.3, 2.5, 2.6, 2.7, 2.8, 3.1–3.7
 */

import { connectToDatabase } from './db';
import UserModel from '../models/User';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SendOtpResult {
    ok: boolean;
    retryAfter?: number;
    error?: string;
}

export interface VerifyOtpResult {
    ok: boolean;
    userId?: string;
    error?: 'invalid' | 'expired' | 'max_attempts' | 'not_found';
}

export type OtpPurpose = 'register' | 'login' | 'link';

// ── Constants ─────────────────────────────────────────────────────────────────

const COOLDOWN_SECONDS = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isValidE164(mobileNumber: string): boolean {
    return /^\+\d{7,15}$/.test(mobileNumber);
}

/** Returns a Twilio client scoped to the Verify service. */
async function getTwilioVerify() {
    const twilio = (await import('twilio')).default;
    const client = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
    );
    return client.verify.v2.services(process.env.TWILIO_SERVICE_SID!);
}

// ── sendOtp ───────────────────────────────────────────────────────────────────

export async function sendOtp(
    mobileNumber: string,
    purpose: OtpPurpose
): Promise<SendOtpResult> {
    if (!isValidE164(mobileNumber)) {
        return { ok: false, error: 'Invalid mobile number format.' };
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ mobileNumber });

    // Purpose-specific pre-checks
    if (purpose === 'register') {
        // Reject only if this is a fully confirmed account (has password or oauth, not a pending placeholder)
        if (user && (user.password || user.oauthProvider)) {
            return { ok: false, error: 'Mobile number already in use.' };
        }
    } else if (purpose === 'login') {
        if (!user) {
            return { ok: false, error: 'No account found for this number.' };
        }
    }

    // Cooldown check
    if (user?.otpLastSentAt) {
        const secondsElapsed = (Date.now() - user.otpLastSentAt.getTime()) / 1000;
        if (secondsElapsed < COOLDOWN_SECONDS) {
            const retryAfter = Math.ceil(COOLDOWN_SECONDS - secondsElapsed);
            return {
                ok: false,
                retryAfter,
                error: `Please wait ${retryAfter} seconds before requesting a new code.`,
            };
        }
    }

    // Trigger Twilio Verify — if this throws, nothing is written to DB
    const verifyService = await getTwilioVerify();
    const verification = await verifyService.verifications.create({
        to: mobileNumber,
        channel: 'sms',
    });
    console.log(`[OTP] Twilio Verify sent to=${mobileNumber} status=${verification.status}`);

    const now = new Date();

    if (user) {
        user.otpLastSentAt = now;
        user.otpAttempts = 0;
        await user.save();
    } else {
        // Upsert placeholder for register flow — avoids duplicate key on retry
        const pendingEmail = `otp-pending-${mobileNumber.replace('+', '')}@pending.local`;
        const existing = await UserModel.findOne({ email: pendingEmail });
        if (existing) {
            existing.otpAttempts = 0;
            existing.otpLastSentAt = now;
            await existing.save();
        } else {
            await UserModel.create({
                name: mobileNumber,
                email: pendingEmail,
                mobileNumber,
                otpAttempts: 0,
                otpLastSentAt: now,
            });
        }
    }

    return { ok: true, retryAfter: COOLDOWN_SECONDS };
}

// ── verifyOtp ─────────────────────────────────────────────────────────────────

export async function verifyOtp(
    mobileNumber: string,
    code: string
): Promise<VerifyOtpResult> {
    if (!isValidE164(mobileNumber)) {
        return { ok: false, error: 'not_found' };
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ mobileNumber });
    if (!user) {
        return { ok: false, error: 'not_found' };
    }

    // Delegate verification to Twilio Verify
    let status: string;
    try {
        const verifyService = await getTwilioVerify();
        const check = await verifyService.verificationChecks.create({
            to: mobileNumber,
            code,
        });
        status = check.status; // 'approved' | 'pending' | 'canceled' | 'expired'
        console.log(`[OTP] verificationCheck to=${mobileNumber} status=${status}`);
    } catch (err: unknown) {
        const twilioErr = err as { code?: number; message?: string };
        console.error(`[OTP] verificationCheck error to=${mobileNumber} code=${twilioErr?.code} msg=${twilioErr?.message}`);
        // Twilio error 20404 = verification not found / already used / expired
        if (twilioErr?.code === 20404 || twilioErr?.code === 60200) {
            return { ok: false, error: 'expired' };
        }
        return { ok: false, error: 'invalid' };
    }

    if (status !== 'approved') {
        // Twilio returns 'pending' for wrong code, 'expired' for expired
        if (status === 'expired') return { ok: false, error: 'expired' };
        return { ok: false, error: 'invalid' };
    }

    // Clear OTP tracking fields on success
    user.otpLastSentAt = undefined;
    user.otpAttempts = 0;
    await user.save();

    return { ok: true, userId: user._id.toString() };
}
