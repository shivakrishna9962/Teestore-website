'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import RevenueChart from '@/components/RevenueChart';
import { formatPrice } from '@/lib/helpers';

interface DashboardData {
    revenue: number;
    orders: number;
    newShoppers: number;
    topProducts: { title: string; sold: number }[];
    dailyRevenue: { date: string; revenue: number }[];
    recentOrders: { _id: string; createdAt: string; total: number; status: string; userEmail?: string }[];
}

const STATUS_COLORS: Record<string, string> = {
    Confirmed: 'bg-blue-100 text-blue-700',
    Processing: 'bg-yellow-100 text-yellow-700',
    Shipped: 'bg-purple-100 text-purple-700',
    'Out for Delivery': 'bg-orange-100 text-orange-700',
    Delivered: 'bg-green-100 text-green-700',
};

export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/dashboard');
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <span className="text-sm text-gray-400">Auto-refreshes every 5 min</span>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Revenue (This Month)', value: `$${formatPrice(data?.revenue ?? 0)}`, icon: '💰' },
                    { label: 'Orders (This Month)', value: String(data?.orders ?? 0), icon: '📦' },
                    { label: 'New Shoppers', value: String(data?.newShoppers ?? 0), icon: '👤' },
                    { label: 'Top Product', value: data?.topProducts?.[0]?.title ?? '—', icon: '🏆' },
                ].map((card) => (
                    <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="text-2xl mb-2">{card.icon}</div>
                        <p className="text-sm text-gray-500">{card.label}</p>
                        <p className="text-xl font-bold text-gray-900 mt-1 truncate">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">Revenue — Last 30 Days</h2>
                    <RevenueChart data={data?.dailyRevenue ?? []} />
                </div>

                {/* Top Products */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">Top 5 Products</h2>
                    {(data?.topProducts ?? []).length === 0 ? (
                        <p className="text-sm text-gray-400">No data yet.</p>
                    ) : (
                        <ol className="flex flex-col gap-3">
                            {(data?.topProducts ?? []).map((p, i) => (
                                <li key={i} className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                                        <span className="text-gray-800 truncate max-w-[140px]">{p.title}</span>
                                    </span>
                                    <span className="text-gray-500 font-medium">{p.sold} sold</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Recent Orders</h2>
                    <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-black hover:underline">View all</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Order ID', 'Customer', 'Date', 'Total', 'Status'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(data?.recentOrders ?? []).map((order) => (
                                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-sm font-mono text-gray-700">#{order._id.slice(-8).toUpperCase()}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{order.userEmail ?? '—'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPrice(order.total)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(data?.recentOrders ?? []).length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-8">No orders yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
