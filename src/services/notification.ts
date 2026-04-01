import { connectToDatabase } from '@/lib/db';
import NotificationModel from '@/models/Notification';

/**
 * Creates an in-app notification for a user.
 */
export async function createNotification(
    userId: string,
    event: string,
    message: string
): Promise<void> {
    await connectToDatabase();
    await NotificationModel.create({ user: userId, event, message });
}

/**
 * Sends a transactional email via the Resend API.
 * If RESEND_API_KEY is not set, logs a warning and skips sending.
 */
export async function sendEmail(
    to: string,
    subject: string,
    html: string
): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('[notification service] RESEND_API_KEY not set — skipping email to', to);
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM ?? 'noreply@example.com',
                to,
                subject,
                html,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[notification service] Resend API error:', response.status, errorBody);
        }
    } catch (err) {
        console.error('[notification service] Failed to send email:', err);
    }
}
