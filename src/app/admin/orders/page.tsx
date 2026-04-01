'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AdminDataTable from '@/components/AdminDataTable';
import InvoiceDownloadButton from '@/components/InvoiceDownloadButton';
import { formatPrice } from '@/lib/helpers';
import type { Order } from '@/types/order';

const STATUSES = ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
const STATUS_NEXT: Record<string, string[]> = {
    Confirmed: ['Processing'],
    Processing: ['Shipped'],
    Shipped: ['Out for Delivery'],
    'Out for Delivery': ['Delivered'],
    Delivered: [],
    Cancelled: [],
};
const STATUS_COLORS: Record<string, string> = {
    Confirmed: 'bg-blue-100 text-blue-700',
    Processing: 'bg-yellow-100 text-yellow-700',
    Shipped: 'bg-purple-100 text-purple-700',
    'Out for Delivery': 'bg-orange-100 text-orange-700',
    Delivered: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
};

interface StatusUpdate {
    orderId: string;
    currentStatus: string;
    newStatus: string;
    trackingNumber: string;
    carrier: string;
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [search, setSearch] = useState('');
    const [statusUpdate, setStatusUpdate] = useState<StatusUpdate | null>(null);
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);
            if (search) params.set('q', search);
            const res = await fetch(`/api/orders?${params.toString()}`);
            if (res.ok) { const d = await res.json(); setOrders(d.orders ?? d); }
        } finally { setLoading(false); }
    }, [statusFilter, dateFrom, dateTo, search]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    async function handleExportCsv() {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
        const res = await fetch(`/api/orders/export?${params.toString()}`);
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orders.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    async function handleStatusUpdate() {
        if (!statusUpdate) return;
        if (statusUpdate.newStatus === 'Shipped' && !statusUpdate.trackingNumber.trim()) {
            setUpdateError('Tracking number is required for Shipped status.');
            return;
        }
        setUpdating(true);
        setUpdateError(null);
        try {
            const res = await fetch(`/api/orders/${statusUpdate.orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: statusUpdate.newStatus,
                    trackingNumber: statusUpdate.trackingNumber || undefined,
                    carrier: statusUpdate.carrier || undefined,
                }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Update failed'); }
            setStatusUpdate(null);
            loadOrders();
        } catch (err: any) {
            setUpdateError(err.message ?? 'Something went wrong.');
        } finally { setUpdating(false); }
    }

    const columns = [
        { key: 'id', label: 'Order ID', render: (o: Order) => <span className="font-mono text-xs text-gray-700">#{o._id?.slice(-8).toUpperCase()}</span> },
        { key: 'date', label: 'Date', render: (o: Order) => o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—' },
        { key: 'total', label: 'Total', render: (o: Order) => `$${formatPrice(o.total)}` },
        {
            key: 'status', label: 'Status',
            render: (o: Order) => <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>,
        },
        {
            key: 'actions', label: 'Actions',
            render: (o: Order) => (
                <div className="flex gap-2 flex-wrap">
                    {(STATUS_NEXT[o.status] ?? []).length > 0 && (
                        <button
                            onClick={() => setStatusUpdate({ orderId: o._id!, currentStatus: o.status, newStatus: STATUS_NEXT[o.status][0], trackingNumber: '', carrier: '' })}
                            className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                            Update Status
                        </button>
                    )}
                    <InvoiceDownloadButton orderId={o._id!} />
                </div>
            ),
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
                <button onClick={handleExportCsv} className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <input type="text" placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-48" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>

            <AdminDataTable columns={columns} data={orders} loading={loading} />

            {/* Status Update Modal */}
            {statusUpdate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Update Order Status</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Order <span className="font-mono font-semibold">#{statusUpdate.orderId.slice(-8).toUpperCase()}</span>
                        </p>
                        {updateError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{updateError}</div>}
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                                <select
                                    value={statusUpdate.newStatus}
                                    onChange={(e) => setStatusUpdate((s) => s ? { ...s, newStatus: e.target.value } : s)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                >
                                    {(STATUS_NEXT[statusUpdate.currentStatus] ?? []).map((s) => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            {statusUpdate.newStatus === 'Shipped' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number *</label>
                                        <input type="text" value={statusUpdate.trackingNumber}
                                            onChange={(e) => setStatusUpdate((s) => s ? { ...s, trackingNumber: e.target.value } : s)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                            placeholder="e.g. 1Z999AA10123456784" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                                        <input type="text" value={statusUpdate.carrier}
                                            onChange={(e) => setStatusUpdate((s) => s ? { ...s, carrier: e.target.value } : s)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                            placeholder="e.g. UPS, FedEx, USPS" />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setStatusUpdate(null); setUpdateError(null); }}
                                className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleStatusUpdate} disabled={updating}
                                className="flex-1 bg-black text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors">
                                {updating ? 'Updating...' : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
