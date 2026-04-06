import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import type { Product } from '@/types/product';

async function getProduct(id: string): Promise<{ product: Product; inventory: any[] } | null> {
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const res = await fetch(`${base}/api/products/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const product = data.product ?? data;
    return { product, inventory: data.inventory ?? [] };
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: PageProps) {
    const { id } = await params;
    const result = await getProduct(id);
    if (!result) notFound();
    return <ProductDetailClient product={result.product} inventory={result.inventory} />;
}
