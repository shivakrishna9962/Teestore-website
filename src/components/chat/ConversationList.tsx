'use client';

import { Conversation } from '@/types/chat';

interface ConversationListProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelect: (id: string) => void;
}

function formatTimestamp(iso: string | null | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationList({
    conversations,
    activeConversationId,
    onSelect,
}: ConversationListProps) {
    return (
        <ul className="flex flex-col overflow-y-auto bg-gray-800 h-full">
            {conversations.map((conv) => {
                const isActive = conv._id === activeConversationId;
                const preview =
                    conv.lastMessage.length > 60
                        ? conv.lastMessage.slice(0, 60) + '…'
                        : conv.lastMessage;

                return (
                    <li key={conv._id}>
                        <button
                            onClick={() => onSelect(conv._id)}
                            className={`w-full text-left px-4 py-3 flex flex-col gap-1 border-b border-gray-700 hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-700 border-l-2 border-l-blue-500' : ''
                                }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-gray-100 truncate">
                                    {conv.user?.name ?? 'Unknown'}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {conv.adminUnreadCount > 0 && (
                                        <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                            {conv.adminUnreadCount}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {formatTimestamp(conv.lastMessageAt)}
                                    </span>
                                </div>
                            </div>
                            <span className="text-xs text-gray-400 truncate">{preview}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
