'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { selectAdminTotalUnread } from '@/features/chat/chatSlice';

export default function AdminChatNavItem() {
    const adminTotalUnread = useSelector(selectAdminTotalUnread);
    const badgeCount = adminTotalUnread > 9 ? '9+' : adminTotalUnread;

    return (
        <Link
            href="/admin/chat"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
            <span>💬</span>
            Chat
            {adminTotalUnread > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1">
                    {badgeCount}
                </span>
            )}
        </Link>
    );
}
