'use client';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
    fetchProducts,
    setSearchQuery,
    setFilters,
    setSort,
    setPage,
    resetFilters,
} from '@/features/products/productSlice';
import ProductCard from '@/components/ProductCard';
import SearchBar from '@/components/SearchBar';
import Link from 'next/link';
import type { Product } from '@/types/product';

const CATEGORIES = ['Casual Wear', 'Special Wear', 'Formal', 'Graphic Tees'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Black', 'White', 'Gray', 'Navy', 'Red', 'Green', 'Blue'];
const SORTS = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'best_selling', label: 'Best Selling' },
];

export default function ProductsPage() {
    const dispatch = useAppDispatch();
    const { products, total, pages, page, filters, sort, searchQuery, loading } = useAppSelector(
        (s) => s.products
    );

    useEffect(() => {
        dispatch(fetchProducts());
    }, [dispatch, filters, sort, page, searchQuery]);

    const toggleSize = (size: string) => {
        const sizes = filters.sizes.includes(size)
            ? filters.sizes.filter((s) => s !== size)
            : [...filters.sizes, size];
        dispatch(setFilters({ ...filters, sizes }));
    };

    const toggleColor = (color: string) => {
        const colors = filters.colors.includes(color)
            ? filters.colors.filter((c) => c !== color)
            : [...filters.colors, color];
        dispatch(setFilters({ ...filters, colors }));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg">Filters</h2>
                        <button onClick={() => dispatch(resetFilters())} className="text-sm text-gray-500 hover:text-black underline">
                            Clear All
                        </button>
                    </div>
                    {/* Category */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-sm mb-2 uppercase tracking-wide text-gray-700">Category</h3>
                        {CATEGORIES.map((cat) => (
                            <label key={cat} className="flex items-center gap-2 mb-1 cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    checked={filters.category === cat}
                                    onChange={() => dispatch(setFilters({ ...filters, category: filters.category === cat ? '' : cat }))}
                                    className="rounded"
                                />
                                {cat}
                            </label>
                        ))}
                    </div>
                    {/* Size */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-sm mb-2 uppercase tracking-wide text-gray-700">Size</h3>
                        <div className="flex flex-wrap gap-2">
                            {SIZES.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => toggleSize(size)}
                                    className={`px-3 py-1 text-xs border rounded ${filters.sizes.includes(size) ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Color */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-sm mb-2 uppercase tracking-wide text-gray-700">Color</h3>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => toggleColor(color)}
                                    className={`px-3 py-1 text-xs border rounded ${filters.colors.includes(color) ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
                                >
                                    {color}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Price Range */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-sm mb-2 uppercase tracking-wide text-gray-700">Price (cents)</h3>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.minPrice ?? ''}
                                onChange={(e) => dispatch(setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : null }))}
                                className="w-full border rounded px-2 py-1 text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Max"
                                value={filters.maxPrice ?? ''}
                                onChange={(e) => dispatch(setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : null }))}
                                className="w-full border rounded px-2 py-1 text-sm"
                            />
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="flex-1">
                            <SearchBar
                                value={searchQuery}
                                onChange={(q) => dispatch(setSearchQuery(q))}
                                placeholder="Search T-shirts..."
                            />
                        </div>
                        <select
                            value={sort}
                            onChange={(e) => dispatch(setSort(e.target.value))}
                            className="border rounded px-3 py-2 text-sm"
                        >
                            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>

                    <p className="text-sm text-gray-500 mb-4">{total} products found</p>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((p: Product) => <ProductCard key={p._id} product={p} />)}
                        </div>
                    )}

                    {/* Pagination */}
                    {pages > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => dispatch(setPage(p))}
                                    className={`w-9 h-9 rounded text-sm ${p === page ? 'bg-black text-white' : 'border border-gray-300 hover:border-black'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
