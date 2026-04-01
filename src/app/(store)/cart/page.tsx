'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchCart, applyDiscount, selectCartTotals } from '@/features/cart/cartSlice';
import CartItem from '@/components/CartItem';
import { formatPrice } from '@/lib/helpers';
import type { CartItem as CartItemType } from '@/types/cart';

interface EnrichedItem extends CartItemType {
    productTitle: string;
    productImage: string;
    currentStock?: number;
}

export default function CartPage() {
    const dispatch = useAppDispatch();
    const { items, discountCode, loading, error } = useAppSelector((s) => s.cart);
    const totals = useAppSelector(selectCartTotals);

    const [enriched, setEnriched] = useState<EnrichedItem[]>([]);
    const [discountInput, setDiscountInput] = useState('');
    const [discountMsg, setDiscountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => { dispatch(fetchCart()); }, [dispatch]);

    // Enrich items with product data + stock
    useEffect(() => {
        if (!items.length) { setEnriched([]); return; }
        Promise.all(
            items.map(async (item) => {
                try {
                    // item.product may be a populated object or just an ID string
                    const productObj = typeof item.product === 'object' && item.product !== null ? item.product as any : null;
                    const productId = productObj?._id ?? item.product;

                    // If already populated, use it directly; otherwise fetch
                    if (productObj?.title) {
                        const res = await fetch(`/api/products/${productId}?size=${item.size}&color=${encodeURIComponent(item.color)}`);
                        const data = res.ok ? await res.json() : null;
                        const variant = (data?.inventory ?? []).find((v: any) => v.size === item.size && v.color === item.color);
                        return {
                            ...item,
                            product: String(productId),
                            productTitle: productObj.title,
                            productImage: productObj.images?.[0] ?? '/placeholder.png',
                            currentStock: variant?.stock ?? 10, // default to 10 if no inventory data
                        };
                    }

                    const res = await fetch(`/api/products/${productId}?size=${item.size}&color=${encodeURIComponent(item.color)}`);
                    if (!res.ok) return { ...item, product: String(productId), productTitle: 'Unknown', productImage: '/placeholder.png', currentStock: 10 };
                    const data = await res.json();
                    const product = data.product ?? data;
                    const variant = (data.inventory ?? []).find((v: any) => v.size === item.size && v.color === item.color);
                    return {
                        ...item,
                        product: String(productId),
                        productTitle: product.title ?? 'Product',
                        productImage: product.images?.[0] ?? '/placeholder.png',
                        currentStock: variant?.stock ?? 10,
                    };
                } catch {
                    const productId = typeof item.product === 'object' ? (item.product as any)?._id ?? '' : item.product;
                    return { ...item, product: String(productId), productTitle: 'Unknown', productImage: '/placeholder.png', currentStock: 10 };
                }
            })
        ).then(setEnriched);
    }, [items]);

    async function handleApplyDiscount() {
        setDiscountMsg(null);
        try {
            await dispatch(applyDiscount(discountInput)).unwrap();
            setDiscountMsg({ type: 'success', text: 'Discount applied!' });
        } catch {
            setDiscountMsg({ type: 'error', text: 'Invalid or expired discount code.' });
        }
    }

    const hasOutOfStock = enriched.some((i) => typeof i.currentStock === 'number' && i.currentStock === 0);

    if (loading && !items.length) {
        return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
            {items.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-500 text-lg mb-4">Your cart is empty.</p>
                    <Link href="/products" className="inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors">Shop Now</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {enriched.map((item) => (
                            <CartItem key={item._id} item={item} outOfStock={typeof item.currentStock === 'number' && item.currentStock === 0} />
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-xl p-6 h-fit sticky top-20">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                        <div className="flex flex-col gap-2 text-sm text-gray-700">
                            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
                            <div className="flex justify-between"><span>Taxes (10%)</span><span>{formatPrice(totals.taxes)}</span></div>
                            <div className="flex justify-between"><span>Shipping</span><span>{totals.shippingCost === 0 ? 'Free' : `$${formatPrice(totals.shippingCost)}`}</span></div>
                            {totals.discountAmount > 0 && (
                                <div className="flex justify-between text-green-600"><span>Discount ({discountCode})</span><span>-{formatPrice(totals.discountAmount)}</span></div>
                            )}
                            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base text-gray-900">
                                <span>Total</span><span>{formatPrice(totals.total)}</span>
                            </div>
                        </div>

                        {/* Discount Code */}
                        <div className="mt-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Discount code"
                                    value={discountInput}
                                    onChange={(e) => setDiscountInput(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                />
                                <button onClick={handleApplyDiscount} className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors">Apply</button>
                            </div>
                            {discountMsg && (
                                <p className={`text-xs mt-1 ${discountMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{discountMsg.text}</p>
                            )}
                        </div>

                        <Link
                            href="/checkout"
                            className={`mt-6 block text-center py-3 rounded font-semibold transition-colors ${hasOutOfStock || items.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none' : 'bg-black text-white hover:bg-gray-800'}`}
                            aria-disabled={hasOutOfStock || items.length === 0}
                        >
                            Proceed to Checkout
                        </Link>
                        {hasOutOfStock && <p className="text-xs text-red-500 mt-2 text-center">Remove out-of-stock items to continue.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
