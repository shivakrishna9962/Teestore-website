'use client';

import { useEffect, useState } from 'react';

interface InventoryVariant {
    _id: string;
    product: { _id: string; title: string } | string;
    size: string;
    color: string;
    stock: number;
}

export default function AdminInventoryPage() {
    const [variants, setVariants] = useState<InventoryVariant[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editStock, setEditStock] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvResult, setCsvResult] = useState<{ applied: number; errors: { row: number; error: string }[] } | null>(null);
    const [csvLoading, setCsvLoading] = useState(false);
    const [search, setSearch] = useState('');

    async function loadInventory() {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory');
            if (res.ok) { const d = await res.json(); setVariants(d.variants ?? d); }
        } finally { setLoading(false); }
    }

    useEffect(() => { loadInventory(); }, []);

    async function handleSaveStock(variantId: string) {
        const stock = parseInt(editStock, 10);
        if (isNaN(stock) || stock < 0) return;
        setSaving(true);
        try {
            await fetch(`/api/inventory/${variantId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock }),
            });
            setVariants((prev) => prev.map((v) => v._id === variantId ? { ...v, stock } : v));
            setEditingId(null);
        } finally { setSaving(false); }
    }

    async function handleCsvImport() {
        if (!csvFile) return;
        setCsvLoading(true);
        setCsvResult(null);
        try {
            const fd = new FormData();
            fd.append('file', csvFile);
            const res = await fetch('/api/inventory/import', { method: 'POST', body: fd });
            const d = await res.json();
            setCsvResult(d);
            loadInventory();
        } finally { setCsvLoading(false); }
    }

    const productTitle = (v: InventoryVariant) =>
        typeof v.product === 'string' ? v.product : v.product?.title ?? '—';

    const filtered = variants.filter((v) => {
        const q = search.toLowerCase();
        return !q || productTitle(v).toLowerCase().includes(q) || v.size.toLowerCase().includes(q) || v.color.toLowerCase().includes(q);
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Inventory</h1>

            {/* CSV Import */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                <h2 className="font-semibold text-gray-900 mb-3">Bulk Import via CSV</h2>
                <p className="text-xs text-gray-500 mb-3">CSV format: <code className="bg-gray-100 px-1 rounded">variantId,stock</code></p>
                <div className="flex flex-wrap gap-3 items-center">
                    <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} className="text-sm text-gray-600" />
                    <button
                        onClick={handleCsvImport}
                        disabled={!csvFile || csvLoading}
                        className="bg-black text-white px-4 py-2 rounded text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors"
                    >
                        {csvLoading ? 'Importing...' : 'Import'}
                    </button>
                </div>
                {csvResult && (
                    <div className="mt-3 text-sm">
                        <p className="text-green-700 font-medium">{csvResult.applied} row(s) applied successfully.</p>
                        {csvResult.errors?.length > 0 && (
                            <ul className="mt-2 text-red-600 space-y-1">
                                {csvResult.errors.map((e, i) => (
                                    <li key={i}>Row {e.row}: {e.error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by product, size, or color..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
            </div>

            {/* Inventory Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Product', 'Size', 'Color', 'Stock', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.map((variant) => (
                                <tr key={variant._id} className={`hover:bg-gray-50 transition-colors ${variant.stock === 0 ? 'bg-red-50' : ''}`}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{productTitle(variant)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{variant.size}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{variant.color}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {editingId === variant._id ? (
                                            <input
                                                type="number"
                                                min="0"
                                                value={editStock}
                                                onChange={(e) => setEditStock(e.target.value)}
                                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className={`font-semibold ${variant.stock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                {variant.stock}
                                                {variant.stock === 0 && <span className="ml-1 text-xs font-normal text-red-500">(Out of stock)</span>}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === variant._id ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleSaveStock(variant._id)} disabled={saving}
                                                    className="text-xs px-3 py-1 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-60 transition-colors">
                                                    {saving ? '...' : 'Save'}
                                                </button>
                                                <button onClick={() => setEditingId(null)}
                                                    className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setEditingId(variant._id); setEditStock(String(variant.stock)); }}
                                                className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && filtered.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-8">No inventory records found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
