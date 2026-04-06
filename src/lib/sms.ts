/**
 * SMS provider abstraction for OTP delivery.
 * Requirement 6.2: configurable provider via environment variables.
 */

export interface SmsProvider {
    send(to: string, body: string): Promise<{ messageId: string }>;
}

/**
 * Twilio Verify adapter — uses the Verify Service API.
 * Reads credentials from environment variables:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SERVICE_SID
 *
 * Note: The OTP code is generated and managed by Twilio Verify,
 * so the `body` parameter (which contains our generated code) is ignored —
 * Twilio sends its own code. The verifyOtp function must be updated
 * to use Twilio Verify's check endpoint instead of bcrypt comparison.
 */
function createTwilioProvider(): SmsProvider {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
        throw new Error(
            'Twilio provider requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SERVICE_SID environment variables.'
        );
    }

    return {
        async send(to: string, _body: string): Promise<{ messageId: string }> {
            const twilio = (await import('twilio')).default;
            const client = twilio(accountSid, authToken);

            const verification = await client.verify.v2
                .services(serviceSid)
                .verifications.create({ to, channel: 'sms' });

            console.log(`[SMS] Twilio Verify sent to=${to} status=${verification.status} sid=${verification.sid}`);

            return { messageId: verification.sid };
        },
    };
}

/**
 * Console/dev provider — logs the OTP to stdout instead of sending an SMS.
 * Used automatically when Twilio env vars are not configured.
 */
function createConsoleProvider(): SmsProvider {
    return {
        async send(to: string, body: string): Promise<{ messageId: string }> {
            const messageId = `dev-${Date.now()}`;
            console.log(`[SMS DEV] to=${to} | ${body} | messageId=${messageId}`);
            return { messageId };
        },
    };
}

/**
 * Factory that returns the configured SMS provider.
 * Falls back to a console logger in development when Twilio env vars are absent.
 */
export function createSmsProvider(): SmsProvider {
    const hasTwilio =
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM_NUMBER;

    if (hasTwilio) {
        return createTwilioProvider();
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'SMS provider is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.'
        );
    }

    console.warn('[SMS] Twilio env vars not set — using console provider for development.');
    return createConsoleProvider();
}
