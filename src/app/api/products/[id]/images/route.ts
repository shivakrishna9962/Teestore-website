import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import ProductModel from '@/models/Product';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();
        const product = await ProductModel.findById(id);
        if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

        const formData = await req.formData();
        const files = formData.getAll('images') as File[];

        if (!files.length) return NextResponse.json({ error: 'No images provided.' }, { status: 400 });
        if (product.images.length + files.length > 6) {
            return NextResponse.json({ error: 'Maximum 6 images per product.' }, { status: 400 });
        }

        const urls: string[] = [];
        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const url = await uploadToCloudinary(buffer, 'products');
            urls.push(url);
        }

        product.images.push(...urls);
        await product.save();

        return NextResponse.json({ images: product.images });
    } catch (err) {
        console.error('[POST /api/products/[id]/images]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
