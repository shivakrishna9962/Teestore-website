'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { toggleWishlist, selectIsWishlisted } from '@/features/wishlist/wishlistSlice';
import { formatPrice } from '@/lib/helpers';
import type { Product } from '@/types/product';

interface ProductCardProps {
    product: Product;
    outOfStock?: boolean;
}

export default function ProductCard({ product, outOfStock = false }: ProductCardProps) {
    const dispatch = useAppDispatch();
    const isWishlisted = useAppSelector(selectIsWishlisted(product._id ?? ''));

    function handleWishlistToggle(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (product._id) {
            dispatch(toggleWishlist(product._id));
        }
    }

    const imageUrl = product.images?.[0] ?? '/placeholder.png';

    return (
        <Link href={`/products/${product._id}`} className="group block">
            <div className="relative bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
                {/* Product image */}
                <div className="relative aspect-square bg-gray-100">
                    <Image
                        src={imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />

                    {/* Out of stock overlay */}
                    {outOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">Out of Stock</span>
                        </div>
                    )}

                    {/* Wishlist button */}
                    <button
                        onClick={handleWishlistToggle}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white transition-colors"
                        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                        <span className={`text-lg ${isWishlisted ? 'text-red-500' : 'text-gray-400'}`}>
                            {isWishlisted ? '♥' : '♡'}
                        </span>
                    </button>
                </div>

                {/* Card body */}
                <div className="p-3">
                    {/* Category badge */}
                    <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mb-1 capitalize">
                        {product.category}
                    </span>

                    <h3 className="font-medium text-gray-900 truncate">{product.title}</h3>

                    <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-900 font-semibold">{formatPrice(product.price)}</span>
                        {outOfStock && (
                            <span className="text-xs text-red-500 font-medium">Out of Stock</span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
