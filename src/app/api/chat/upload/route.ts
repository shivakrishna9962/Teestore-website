import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const ACCEPTED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
            { error: `Invalid file type. Accepted types: ${[...ACCEPTED_MIME_TYPES].join(', ')}` },
            { status: 400 }
        );
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json(
            { error: 'File size exceeds the 10 MB limit' },
            { status: 400 }
        );
    }

    const ext = path.extname(file.name) || '';
    const uuid = crypto.randomUUID();
    const filename = `${uuid}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');

    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const type: 'image' | 'document' = IMAGE_MIME_TYPES.has(file.type) ? 'image' : 'document';

    return NextResponse.json({
        url: `/uploads/chat/${filename}`,
        name: file.name,
        type,
    });
}
