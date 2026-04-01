'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchNotifications, markNotificationsRead } from '@/features/notifications/notificationsSlice';
import type { NotificationEvent } from '@/types/notification';

const EVENT_ICONS: Record<NotificationEvent, string> = {
    registration: '👋',
    order_confirmed: '✅',
    order_status_changed: '📦',
    password_reset: '🔑',
    low_stock: '⚠️',
};

function timeAgo(date: Date | string | undefined): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationPanelProps {
    onClose?: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
    const dispatch = useAppDispatch();
    const { notifications, loading } = useAppSelector((s) => s.notifications);

    useEffect(() => {
        dispatch(fetchNotifications());
        dispatch(markNotificationsRead());
    }, [dispatch]);

    return (
        <div className="w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                        ×
                    </button>
                )}
            </div>

            <div className="max-h-80 overflow-y-auto">
                {loading && (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">Loading...</div>
                )}
                {!loading && notifications.length === 0 && (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">No notifications</div>
                )}
                {!loading && notifications.map((n) => (
                    <div
                        key={n._id}
                        className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${!n.read ? 'bg-blue-50' : ''
                            }`}
                    >
                        <span className="text-xl flex-shrink-0 mt-0.5">
                            {EVENT_ICONS[n.event] ?? '🔔'}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
