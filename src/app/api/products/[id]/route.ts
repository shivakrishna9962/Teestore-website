import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import ProductModel from '@/models/Product';
import InventoryModel from '@/models/Inventory';
import { uploadBase64ToCloudinary } from '@/lib/cloudinary';

async function saveBase64Images(base64s: string[], _productId: string): Promise<string[]> {
    const urls: string[] = [];
    for (const b64 of base64s) {
        const url = await uploadBase64ToCloudinary(b64, 'products');
        urls.push(url);
    }
    return urls;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        await connectToDatabase();
        const product = await ProductModel.findOne({ _id: id, active: true }).lean();
        if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
        const inventory = await InventoryModel.find({ product: id }).lean();
        return NextResponse.json({ product, inventory });
    } catch (err) {
        console.error('[GET /api/products/[id]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: productId } = await context.params;
        const cleanId = productId.trim();
        await connectToDatabase();

        // Verify product exists first (including inactive ones for admin)
        const existing = await ProductModel.findById(cleanId);
        if (!existing) {
            console.error('[PUT /api/products/[id]] Product not found for id:', cleanId);
            return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
        }

        const body = await req.json();
        const { imageBase64s, ...rest } = body;
        const allowed = ['title', 'description', 'price', 'category', 'sizes', 'colors', 'featured', 'images', 'active'];
        const update: Record<string, unknown> = {};
        for (const key of allowed) {
            if (key in rest) update[key] = rest[key];
        }

        if (imageBase64s?.length) {
            const urls = await saveBase64Images(imageBase64s, cleanId);
            // If client sent an explicit images array (surviving existing images), use that as base
            // Otherwise fall back to what's already in the DB
            const base: string[] = Array.isArray(update.images)
                ? (update.images as string[])
                : (existing.images ?? []);
            update.images = [...base, ...urls];
        }

        const product = await ProductModel.findByIdAndUpdate(cleanId, { $set: update }, { new: true });
        if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

        return NextResponse.json({ product: { ...product.toObject(), _id: product._id.toString() } });
    } catch (err) {
        console.error('[PUT /api/products/[id]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: productId } = await context.params;
        await connectToDatabase();
        const product = await ProductModel.findByIdAndUpdate(productId, { active: false }, { new: true });
        if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

        return NextResponse.json({ message: 'Product deactivated.' });
    } catch (err) {
        console.error('[DELETE /api/products/[id]]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
