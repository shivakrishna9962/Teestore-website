import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import ProductModel from '@/models/Product';
import InventoryModel from '@/models/Inventory';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const PAGE_SIZE = 12;

async function saveBase64Images(base64s: string[], productId: string): Promise<string[]> {
    const uploadDir = join(process.cwd(), 'public', 'images', 'products');
    await mkdir(uploadDir, { recursive: true });
    const urls: string[] = [];
    for (const b64 of base64s) {
        const matches = b64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) continue;
        const ext = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `product_${productId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        await writeFile(join(uploadDir, filename), buffer);
        urls.push(`/images/products/${filename}`);
    }
    return urls;
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = req.nextUrl;

        const query = searchParams.get('q') ?? '';
        const category = searchParams.get('category') ?? '';
        const sizes = searchParams.getAll('size');
        const colors = searchParams.getAll('color');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const sort = searchParams.get('sort') ?? 'newest';
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
        const limit = parseInt(searchParams.get('limit') ?? String(PAGE_SIZE), 10);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: Record<string, any> = { active: true };

        if (query.length >= 2) filter.$text = { $search: query };
        if (category) filter.category = category;
        if (sizes.length) filter.sizes = { $in: sizes };
        if (colors.length) filter.colors = { $in: colors };
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseInt(minPrice, 10);
            if (maxPrice) filter.price.$lte = parseInt(maxPrice, 10);
        }

        const sortMap: Record<string, Record<string, 1 | -1>> = {
            newest: { createdAt: -1 },
            price_asc: { price: 1 },
            price_desc: { price: -1 },
            best_selling: { soldCount: -1 },
        };
        const sortOption = sortMap[sort] ?? sortMap.newest;

        const [products, total] = await Promise.all([
            ProductModel.find(filter)
                .sort(sortOption)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .then(docs => docs.map(d => ({ ...d, _id: d._id.toString() }))),
            ProductModel.countDocuments(filter),
        ]);

        return NextResponse.json({ products, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('[GET /api/products]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { title, description, price, category, sizes, colors, featured, imageBase64s, defaultStock } = body;

        if (!title || !price || !category) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        await connectToDatabase();

        // Create product first to get the ID
        const product = await ProductModel.create({
            title,
            description: description ?? '',
            price,
            category,
            sizes: sizes ?? [],
            colors: colors ?? [],
            featured: featured ?? false,
            active: true,
            images: [],
        });

        // Save images and update product
        if (imageBase64s?.length) {
            const urls = await saveBase64Images(imageBase64s, product._id.toString());
            product.images = urls;
            await product.save();
        }

        // Initialize inventory for every size × color variant
        if (sizes?.length && colors?.length) {
            const initialStock = typeof defaultStock === 'number' && defaultStock >= 0 ? defaultStock : 0;
            const inventoryDocs = sizes.flatMap((size: string) =>
                colors.map((color: string) => ({
                    product: product._id,
                    size,
                    color,
                    stock: initialStock,
                    lowStockThreshold: 5,
                }))
            );
            await InventoryModel.insertMany(inventoryDocs);
        }

        return NextResponse.json({ product: { ...product.toObject(), _id: product._id.toString() } }, { status: 201 });
    } catch (err) {
        console.error('[POST /api/products]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
