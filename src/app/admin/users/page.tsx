'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminDataTable from '@/components/AdminDataTable';
import { formatPrice } from '@/lib/helpers';
import type { Order } from '@/types/order';

interface AdminUser {
    _id: string;
    name: string;
    email: string;
    createdAt: string;
    orderCount: number;
    status: 'active' | 'suspended';
}

export default function AdminUsersPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [userOrders, setUserOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    async function loadUsers() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) { const d = await res.json(); setUsers(d.users ?? d); }
        } finally { setLoading(false); }
    }

    useEffect(() => { loadUsers(); }, []);

    async function handleSuspend(userId: string) {
        setActionLoading(userId);
        try {
            await fetch(`/api/admin/users/${userId}/suspend`, { method: 'PUT' });
            loadUsers();
        } finally { setActionLoading(null); }
    }

    async function handleReinstate(userId: string) {
        setActionLoading(userId);
        try {
            await fetch(`/api/admin/users/${userId}/reinstate`, { method: 'PUT' });
            loadUsers();
        } finally { setActionLoading(null); }
    }

    async function viewUserOrders(user: AdminUser) {
        setSelectedUser(user);
        setOrdersLoading(true);
        try {
            const res = await fetch(`/api/orders?userId=${user._id}`);
            if (res.ok) { const d = await res.json(); setUserOrders(d.orders ?? d); }
        } finally { setOrdersLoading(false); }
    }

    const currentUserId = (session?.user as any)?.id;

    const columns = [
        { key: 'name', label: 'Name', render: (u: AdminUser) => <span className="font-medium text-gray-900">{u.name}</span> },
        { key: 'email', label: 'Email', render: (u: AdminUser) => <span className="text-gray-600">{u.email}</span> },
        { key: 'createdAt', label: 'Registered', render: (u: AdminUser) => new Date(u.createdAt).toLocaleDateString() },
        { key: 'orderCount', label: 'Orders', render: (u: AdminUser) => u.orderCount },
        {
            key: 'status', label: 'Status',
            render: (u: AdminUser) => (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.status}
                </span>
            ),
        },
        {
            key: 'actions', label: 'Actions',
            render: (u: AdminUser) => {
                const isSelf = u._id === currentUserId;
                return (
                    <div className="flex gap-2">
                        <button onClick={() => viewUserOrders(u)}
                            className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                            Orders
                        </button>
                        {u.status === 'active' ? (
                            <button
                                onClick={() => handleSuspend(u._id)}
                                disabled={isSelf || actionLoading === u._id}
                                title={isSelf ? 'Cannot suspend your own account' : ''}
                                className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {actionLoading === u._id ? '...' : 'Suspend'}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleReinstate(u._id)}
                                disabled={isSelf || actionLoading === u._id}
                                className="text-xs px-3 py-1 border border-green-200 text-green-700 rounded hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {actionLoading === u._id ? '...' : 'Reinstate'}
                            </button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Users</h1>
            <AdminDataTable columns={columns} data={users} loading={loading} />

            {/* User Orders Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedUser.name}</h2>
                                <p className="text-sm text-gray-500">{selectedUser.email}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-3">Order History</h3>
                        {ordersLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
                            </div>
                        ) : userOrders.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4">No orders found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {['Order ID', 'Date', 'Items', 'Total', 'Status'].map((h) => (
                                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {userOrders.map((o) => (
                                            <tr key={o._id}>
                                                <td className="px-3 py-2 font-mono text-xs text-gray-700">#{o._id?.slice(-8).toUpperCase()}</td>
                                                <td className="px-3 py-2 text-gray-600">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                                                <td className="px-3 py-2 text-gray-600">{o.items?.length ?? 0}</td>
                                                <td className="px-3 py-2 font-semibold text-gray-900">{formatPrice(o.total)}</td>
                                                <td className="px-3 py-2 text-gray-600">{o.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <button onClick={() => setSelectedUser(null)} className="mt-4 w-full border border-gray-300 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
