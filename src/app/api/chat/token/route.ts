import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Return the raw JWT string by re-encoding it
    // getToken with raw: true returns the raw JWT string
    const rawToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, raw: true });
    return NextResponse.json({ token: rawToken });
}
