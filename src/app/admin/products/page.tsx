'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import AdminDataTable from '@/components/AdminDataTable';
import { formatPrice } from '@/lib/helpers';
import type { Product } from '@/types/product';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Black', 'White', 'Gray', 'Navy', 'Red', 'Green', 'Blue'];
const CATEGORIES = ['Casual Wear', 'Special Wear', 'Formal', 'Graphic Tees'];

interface ProductForm {
    title: string; description: string; price: string; category: string;
    sizes: string[]; colors: string[]; featured: boolean; defaultStock: string;
}

const EMPTY_FORM: ProductForm = {
    title: '', description: '', price: '', category: CATEGORIES[0],
    sizes: [], colors: [], featured: false, defaultStock: '10',
};

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadProducts() {
        setLoading(true);
        try {
            // Use admin endpoint to get all products including inactive
            const res = await fetch('/api/admin/products?limit=200');
            if (res.ok) {
                const d = await res.json();
                const prods = (d.products ?? []).map((p: any) => ({
                    ...p,
                    _id: typeof p._id === 'object' ? (p._id.$oid ?? String(p._id)) : String(p._id),
                }));
                setProducts(prods);
            } else {
                // Fallback to public endpoint
                const res2 = await fetch('/api/products?limit=200');
                if (res2.ok) {
                    const d = await res2.json();
                    const prods = (d.products ?? []).map((p: any) => ({
                        ...p,
                        _id: typeof p._id === 'object' ? (p._id.$oid ?? String(p._id)) : String(p._id),
                    }));
                    setProducts(prods);
                }
            }
        } finally { setLoading(false); }
    }

    useEffect(() => { loadProducts(); }, []);

    function openCreate() {
        setForm(EMPTY_FORM);
        setImageFiles([]);
        setExistingImages([]);
        setEditProduct(null);
        setError(null);
        setShowCreate(true);
    }

    function openEdit(product: Product) {
        setForm({
            title: product.title,
            description: product.description ?? '',
            price: (product.price / 100).toFixed(2),
            category: product.category ?? CATEGORIES[0],
            sizes: product.sizes ?? [],
            colors: product.colors ?? [],
            featured: product.featured ?? false,
            defaultStock: '10',
        });
        setImageFiles([]);
        setExistingImages(product.images ?? []);
        setEditProduct(product);
        setError(null);
        setShowCreate(true);
    }

    function toggleMulti(arr: string[], val: string): string[] {
        return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
    }

    async function handleSave() {
        if (!form.title.trim() || !form.price) { setError('Title and price are required.'); return; }
        setSaving(true);
        setError(null);
        try {
            let productId = editProduct?._id ? String(editProduct._id) : undefined;

            // Convert image files to base64
            const imageBase64s: string[] = [];
            for (const file of imageFiles) {
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                imageBase64s.push(base64);
            }

            const body = {
                title: form.title,
                description: form.description,
                price: Math.round(parseFloat(form.price) * 100),
                category: form.category,
                sizes: form.sizes,
                colors: form.colors,
                featured: form.featured,
                imageBase64s,
                images: editProduct ? existingImages : undefined,
                defaultStock: parseInt(form.defaultStock, 10) || 0,
            };

            if (editProduct) {
                const res = await fetch(`/api/products/${productId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                });
                if (!res.ok) {
                    const d = await res.json();
                    throw new Error(d.error === 'Forbidden' ? 'You must be logged in as admin to edit products.' : (d.error ?? 'Update failed'));
                }
            } else {
                const res = await fetch('/api/products', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error((await res.json()).error ?? 'Create failed');
                const d = await res.json();
                productId = d.product?._id ?? d._id;
            }

            // Set stock for all size×color variants
            const defaultStock = parseInt(form.defaultStock, 10);
            if (!isNaN(defaultStock) && defaultStock >= 0 && productId) {
                // Fetch inventory for this product then update each variant
                const invRes = await fetch(`/api/inventory?productId=${productId}`, { credentials: 'include' });
                if (invRes.ok) {
                    const invData = await invRes.json();
                    const variants: any[] = invData.variants ?? invData;
                    await Promise.all(
                        variants.map((v: any) =>
                            fetch(`/api/inventory/${v._id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ stock: defaultStock }),
                            })
                        )
                    );
                }
            }

            setShowCreate(false);
            loadProducts();
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Soft-delete this product? It will be hidden from shoppers.')) return;
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        loadProducts();
    }

    const columns = [
        {
            key: 'image', label: 'Image',
            render: (p: Product) => (
                <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100">
                    {p.images?.[0] && <Image src={p.images[0]} alt={p.title} fill className="object-cover" sizes="40px" />}
                </div>
            ),
        },
        { key: 'title', label: 'Title', render: (p: Product) => <span className="font-medium text-gray-900">{p.title}</span> },
        { key: 'category', label: 'Category', render: (p: Product) => <span className="capitalize text-gray-600">{p.category}</span> },
        { key: 'price', label: 'Price', render: (p: Product) => formatPrice(p.price) },
        { key: 'featured', label: 'Featured', render: (p: Product) => p.featured ? '⭐' : '—' },
        {
            key: 'actions', label: 'Actions',
            render: (p: Product) => (
                <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors">Edit</button>
                    <button onClick={() => p._id && handleDelete(p._id)} className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors">Delete</button>
                </div>
            ),
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                <button onClick={openCreate} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                    + Add Product
                </button>
            </div>

            <AdminDataTable columns={columns} data={products} loading={loading} />

            {/* Create / Edit Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">{editProduct ? 'Edit Product' : 'New Product'}</h2>
                        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                                    <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
                                <div className="flex flex-wrap gap-2">
                                    {SIZES.map((s) => (
                                        <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, sizes: toggleMulti(f.sizes, s) }))}
                                            className={`px-3 py-1 text-xs border rounded ${form.sizes.includes(s) ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map((c) => (
                                        <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, colors: toggleMulti(f.colors, c) }))}
                                            className={`px-3 py-1 text-xs border rounded ${form.colors.includes(c) ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stock per variant (applies to all size × color combinations)
                                </label>
                                <input
                                    type="number" min="0" value={form.defaultStock}
                                    onChange={(e) => setForm((f) => ({ ...f, defaultStock: e.target.value }))}
                                    className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="rounded" />
                                Featured product
                            </label>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Images (up to 6, JPEG/PNG, &lt;5MB each)</label>
                                <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                                    onChange={(e) => setImageFiles(Array.from(e.target.files ?? []).slice(0, 6))}
                                    className="text-sm text-gray-600" />

                                {/* New image previews */}
                                {imageFiles.length > 0 && (
                                    <div className="flex gap-3 mt-3 flex-wrap">
                                        {imageFiles.map((f, i) => (
                                            <div key={i} className="group relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setImageFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Remove"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Existing images with hover-delete */}
                                {existingImages.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs text-gray-500 mb-2">Current images:</p>
                                        <div className="flex gap-3 flex-wrap">
                                            {existingImages.map((url, i) => (
                                                <div key={i} className="group relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Remove"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 bg-black text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors">
                                {saving ? 'Saving...' : editProduct ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
