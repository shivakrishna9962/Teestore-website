'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppDispatch } from '@/lib/hooks';
import { toggleWishlist } from '@/features/wishlist/wishlistSlice';
import { addToCart } from '@/features/cart/cartSlice';
import { formatPrice } from '@/lib/helpers';

interface WishlistProduct {
    _id: string; title: string; images: string[];
    price: number; sizes: string[]; colors: string[];
}

export default function WishlistClient({ initialProducts }: { initialProducts: WishlistProduct[] }) {
    const dispatch = useAppDispatch();
    const [products, setProducts] = useState<WishlistProduct[]>(initialProducts);
    const [addingToCart, setAddingToCart] = useState<string | null>(null);

    async function handleRemove(productId: string) {
        setProducts((prev) => prev.filter((p) => p._id !== productId));
        dispatch(toggleWishlist(productId));
    }

    async function handleAddToCart(product: WishlistProduct) {
        if (!product.sizes?.[0] || !product.colors?.[0]) return;
        setAddingToCart(product._id);
        try {
            await dispatch(addToCart({ productId: product._id, size: product.sizes[0], color: product.colors[0] })).unwrap();
        } finally {
            setAddingToCart(null);
        }
    }

    if (products.length === 0) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist</h1>
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">♡</div>
                    <p className="text-gray-500 text-lg mb-4">Your wishlist is empty.</p>
                    <Link href="/products" className="inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors">
                        Browse Products
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist ({products.length})</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <div key={product._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
                        <Link href={`/products/${product._id}`} className="block relative aspect-square bg-gray-100">
                            <Image
                                src={product.images?.[0] ?? '/placeholder.png'}
                                alt={product.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 50vw, 25vw"
                            />
                        </Link>
                        <div className="p-4">
                            <Link href={`/products/${product._id}`}>
                                <h3 className="font-semibold text-gray-900 text-sm truncate hover:underline">{product.title}</h3>
                            </Link>
                            <p className="text-gray-700 font-bold mt-1">{formatPrice(product.price)}</p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => handleAddToCart(product)}
                                    disabled={addingToCart === product._id}
                                    className="flex-1 bg-black text-white text-xs py-2 rounded hover:bg-gray-800 disabled:opacity-60 transition-colors"
                                >
                                    {addingToCart === product._id ? 'Adding...' : 'Add to Cart'}
                                </button>
                                <button
                                    onClick={() => handleRemove(product._id)}
                                    className="p-2 border border-gray-200 rounded hover:border-red-400 hover:text-red-500 transition-colors text-sm"
                                    title="Remove from wishlist"
                                >
                                    ♥
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
