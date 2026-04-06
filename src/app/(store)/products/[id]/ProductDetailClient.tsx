'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { addToCart } from '@/features/cart/cartSlice';
import { toggleWishlist, selectIsWishlisted } from '@/features/wishlist/wishlistSlice';
import { formatPrice } from '@/lib/helpers';
import type { Product } from '@/types/product';

interface InventoryVariant { size: string; color: string; stock: number; }
interface Props { product: Product; inventory: InventoryVariant[]; }

export default function ProductDetailClient({ product, inventory }: Props) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const isWishlisted = useAppSelector(selectIsWishlisted(product._id ?? ''));

    const [mainImage, setMainImage] = useState(product.images?.[0] ?? '/placeholder.png');
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

    function getStock(size: string | null, color: string | null): number | null {
        if (!size || !color) return null;
        const v = inventory.find((i) => i.size === size && i.color === color);
        // Return null (unknown) if variant not found, otherwise return actual stock
        return v !== undefined ? v.stock : null;
    }

    const stock = getStock(selectedSize, selectedColor);
    // Allow adding to cart as long as size & color are selected — API will validate stock
    const canAdd = !!selectedSize && !!selectedColor;

    async function handleAddToCart() {
        if (!canAdd || !product._id) return;
        for (let i = 0; i < quantity; i++) {
            await dispatch(addToCart({ productId: product._id, size: selectedSize!, color: selectedColor! }));
        }
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    }

    async function handleBuyNow() {
        if (!canAdd || !product._id) return;
        // Navigate directly to checkout with product details as query params
        const params = new URLSearchParams({
            productId: product._id,
            size: selectedSize!,
            color: selectedColor!,
            quantity: String(quantity),
        });
        router.push(`/checkout?${params.toString()}`);
    }

    const images = product.images?.length ? product.images : ['/placeholder.png'];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Back to home */}
            <Link href="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-black transition-colors text-sm mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            
            </Link>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">

                {/* ── Left: Image Gallery ── */}
                <div className="md:sticky md:top-20">
                    <div className="relative aspect-[3/4] bg-white rounded-2xl overflow-hidden">
                        <Image
                            src={mainImage}
                            alt={product.title}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority
                        />
                    </div>
                    {images.length > 1 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setMainImage(img)}
                                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${mainImage === img ? 'border-black' : 'border-gray-200 hover:border-gray-400'}`}
                                >
                                    <Image src={img} alt={`view ${i + 1}`} fill className="object-contain" sizes="80px" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right: Product Info ── */}
                <div className="flex flex-col gap-5">
                    {/* Brand / Category */}
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">{product.category}</p>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">{product.title}</h1>

                    {/* Price */}
                    <p className="text-2xl font-semibold text-gray-900">{formatPrice(product.price)}</p>
                    <p className="text-xs text-gray-400">Shipping calculated at checkout.</p>

                    <hr className="border-gray-100" />

                    {/* Description */}
                    <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>

                    <hr className="border-gray-100" />

                    {/* Size Selector */}
                    {product.sizes && product.sizes.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-2">
                                Size: <span className="font-normal text-gray-500">{selectedSize ?? 'Select'}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {product.sizes.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSelectedSize(s)}
                                        className={`w-12 h-10 border rounded text-sm font-medium transition-colors
                                            ${selectedSize === s ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Color Selector */}
                    {product.colors && product.colors.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-2">
                                Color: <span className="font-normal text-gray-500">{selectedColor ?? 'Select'}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {product.colors.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        className={`px-4 py-1.5 border rounded-full text-sm font-medium transition-colors
                                            ${selectedColor === c ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stock status — only show if both selected and stock < 6 */}
                    {selectedSize && selectedColor && stock !== null && stock < 6 && (
                        <p className={`text-sm font-medium ${stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                            {stock === 0 ? 'Out of stock' : `Only ${stock} left`}
                        </p>
                    )}

                    {/* Quantity */}
                    <div>
                        <p className="text-sm font-semibold text-gray-800 mb-2">Quantity</p>
                        <div className="flex items-center gap-0 border border-gray-300 rounded w-fit">
                            <button
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 transition-colors rounded-l"
                            >−</button>
                            <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                            <button
                                onClick={() => setQuantity((q) => Math.min(stock !== null && stock > 0 ? stock : 99, q + 1))}
                                className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 transition-colors rounded-r"
                            >+</button>
                        </div>
                    </div>

                    {/* CTA Buttons — matches reference: wishlist full-width pill, then add-to-cart + buy-now row */}
                    <div className="flex flex-col gap-3 mt-1">
                        {/* Wishlist — full width black pill */}
                        <button
                            onClick={() => product._id && dispatch(toggleWishlist(product._id))}
                            className="w-full py-3.5 rounded-full font-semibold text-sm transition-colors bg-black text-white hover:bg-gray-800"
                        >
                            {isWishlisted ? 'Wishlisted ♥' : 'Add to Wishlist'}
                        </button>

                        {/* Add to Cart + Buy Now — side by side */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleAddToCart}
                                disabled={!canAdd}
                                className="flex-1 py-3.5 bg-black text-white font-semibold rounded-full hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                {added ? '✓ Added!' : 'Add to cart'}
                            </button>
                            <button
                                onClick={handleBuyNow}
                                disabled={!canAdd}
                                className="flex-1 py-3.5 bg-[#4F6EF7] text-white font-bold rounded-full hover:bg-[#3a57e0] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <span>BUY NOW</span>
                                <span className="text-lg">›</span>
                            </button>
                        </div>
                    </div>

                    {/* Trust Badges — 7 icons in a row with SVG outlines */}
                    <div className="flex justify-between items-start pt-2 gap-1">
                        {[
                            {
                                label: 'PREMIUM\nQUALITY',
                                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.5L12 15l-4.9 2.4.9-5.5L4 8l5.6-1.2z" /></svg>,
                            },
                            {
                                label: 'FAST\nSHIPPING',
                                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><rect x="1" y="8" width="15" height="10" rx="1" /><path d="M16 11h4l2 3v4h-6V11z" /><circle cx="5.5" cy="18.5" r="1.5" /><circle cx="18.5" cy="18.5" r="1.5" /></svg>,
                            },
                            {
                                label: 'BEST PRICE\nGUARANTEE',
                                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><circle cx="9" cy="9" r="6" /><path d="M9 6v6M7 8h3a1 1 0 010 2H8a1 1 0 000 2h3" /><path d="M19 19l-4-4" /></svg>,
                            },
                            {
                                label: 'EASY\nRETURNS',
                                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M3 12a9 9 0 109-9H9" /><path d="M9 7l-3 3 3 3" /><path d="M9 12H6" /></svg>,
                            },
                            {
                                label: 'VERIFIED AND\nSECURED',
                                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M12 2l7 4v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>,
                            },
                            {
                                label: 'A+\nRATING',
                                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.5L12 15l-4.9 2.4.9-5.5L4 8l5.6-1.2z" /><text x="9" y="11" fontSize="5" fill="currentColor" stroke="none" fontWeight="bold">A+</text></svg>,
                            },
                            {
                                label: 'SATISFACTION\nGUARANTEED',
                                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /><text x="8.5" y="8" fontSize="4" fill="currentColor" stroke="none" fontWeight="bold">100%</text></svg>,
                            },
                        ].map((b) => (
                            <div key={b.label} className="flex flex-col items-center gap-1 text-center min-w-0">
                                <span className="text-gray-700">{b.svg}</span>
                                <span className="text-[9px] text-gray-500 font-semibold uppercase leading-tight whitespace-pre-line">{b.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Shipping & Returns accordion */}
                    <hr className="border-gray-200" />
                    <details className="group">
                        <summary className="py-3 text-sm text-gray-800 cursor-pointer select-none flex justify-between items-center list-none">
                            Shipping &amp; Returns
                            <svg className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <div className="pb-3 text-sm text-gray-600 space-y-1">
                            <p>Free standard shipping on orders over ₹999.</p>
                            <p>Express delivery available at checkout.</p>
                            <p>Returns accepted within 7 days of delivery.</p>
                        </div>
                    </details>
                    <hr className="border-gray-200" />

                    {/* Share row */}
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="font-medium">Share:</span>
                        {[
                            { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`, svg: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg> },
                            { label: 'X', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`, svg: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
                            { label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`, svg: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg> },
                            { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`, svg: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> },
                            { label: 'Copy', href: '#', svg: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> },
                        ].map((s) => (
                            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                                className="text-gray-700 hover:text-black transition-colors"
                                aria-label={`Share on ${s.label}`}
                                onClick={s.label === 'Copy' ? (e) => { e.preventDefault(); navigator.clipboard?.writeText(window.location.href); } : undefined}
                            >
                                {s.svg}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
