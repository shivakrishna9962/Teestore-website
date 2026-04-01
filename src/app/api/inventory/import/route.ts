import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import InventoryModel from '@/models/Inventory';

interface ImportRow {
    productId: string;
    size: string;
    color: string;
    stock: number;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const rows: ImportRow[] = body?.rows ?? [];

        if (!Array.isArray(rows)) {
            return NextResponse.json({ error: 'rows must be an array.' }, { status: 400 });
        }

        await connectToDatabase();

        const errors: Array<{ row: number; error: string }> = [];
        const validRows: Array<{ index: number; row: ImportRow }> = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.productId) {
                errors.push({ row: i, error: 'productId is required.' });
                continue;
            }
            if (!row.size) {
                errors.push({ row: i, error: 'size is required.' });
                continue;
            }
            if (!row.color) {
                errors.push({ row: i, error: 'color is required.' });
                continue;
            }
            if (typeof row.stock !== 'number' || row.stock < 0 || !Number.isInteger(row.stock)) {
                errors.push({ row: i, error: 'stock must be a non-negative integer.' });
                continue;
            }
            validRows.push({ index: i, row });
        }

        // Apply valid rows via upsert
        let applied = 0;
        for (const { row } of validRows) {
            await InventoryModel.findOneAndUpdate(
                { product: row.productId, size: row.size, color: row.color },
                { stock: row.stock, updatedAt: new Date() },
                { upsert: true, new: true }
            );
            applied++;
        }

        return NextResponse.json({ applied, errors });
    } catch (err) {
        console.error('[POST /api/inventory/import]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
