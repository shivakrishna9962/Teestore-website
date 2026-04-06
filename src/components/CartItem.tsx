'use client';

import Image from 'next/image';
import { useAppDispatch } from '@/lib/hooks';
import { updateCartItem, removeCartItem } from '@/features/cart/cartSlice';
import { formatPrice } from '@/lib/helpers';
import type { CartItem as CartItemType } from '@/types/cart';

interface CartItemProps {
    item: CartItemType & { productTitle: string; productImage: string };
    outOfStock?: boolean;
}

export default function CartItem({ item, outOfStock = false }: CartItemProps) {
    const dispatch = useAppDispatch();
    const itemId = item._id ?? '';
    const lineTotal = item.unitPrice * item.quantity;

    function handleQuantityChange(delta: number) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            dispatch(removeCartItem(itemId));
        } else {
            dispatch(updateCartItem({ itemId, quantity: newQty }));
        }
    }

    function handleRemove() {
        dispatch(removeCartItem(itemId));
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Out of stock warning */}
            {outOfStock && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
                    <span>⚠️</span>
                    <span>This item is out of stock and cannot be purchased.</span>
                </div>
            )}

            <div className={`flex gap-4 p-4 bg-white rounded-lg border ${outOfStock ? 'border-red-200 opacity-75' : 'border-gray-200'}`}>
                {/* Product image */}
                <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    <Image
                        src={item.productImage || '/placeholder.png'}
                        alt={item.productTitle}
                        fill
                        className="object-contain"
                        sizes="80px"
                    />
                </div>

                {/* Item details */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.productTitle}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Size: {item.size} · Color: {item.color}
                    </p>
                    <p className="text-sm text-gray-500">Unit price: {formatPrice(item.unitPrice)}</p>
                </div>

                {/* Quantity controls + price */}
                <div className="flex flex-col items-end justify-between gap-2">
                    <span className="font-semibold text-gray-900">{formatPrice(lineTotal)}</span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleQuantityChange(-1)}
                            className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
                            aria-label="Decrease quantity"
                        >
                            −
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                            onClick={() => handleQuantityChange(1)}
                            className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                            aria-label="Increase quantity"
                        >
                            +
                        </button>
                    </div>

                    <button
                        onClick={handleRemove}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}
