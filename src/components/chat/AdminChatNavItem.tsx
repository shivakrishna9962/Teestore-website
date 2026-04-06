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
            className="flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            title="Chat"
        >
            <span className="text-lg relative">
                💬
                {adminTotalUnread > 0 && (
                    <span className="md:hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1rem] h-4 flex items-center justify-center px-0.5">
                        {badgeCount}
                    </span>
                )}
            </span>
            <span className="hidden md:inline">Chat</span>
            {adminTotalUnread > 0 && (
                <span className="hidden md:flex ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 items-center justify-center px-1">
                    {badgeCount}
                </span>
            )}
        </Link>
    );
}
