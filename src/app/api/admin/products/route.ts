import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import ProductModel from '@/models/Product';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();
        const { searchParams } = req.nextUrl;
        const limit = parseInt(searchParams.get('limit') ?? '200', 10);
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

        const [products, total] = await Promise.all([
            ProductModel.find({})
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .then(docs => docs.map(d => ({ ...d, _id: d._id.toString() }))),
            ProductModel.countDocuments({}),
        ]);

        return NextResponse.json({ products, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('[GET /api/admin/products]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
