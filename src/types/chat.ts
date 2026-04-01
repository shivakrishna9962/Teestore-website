export interface Conversation {
    _id: string;
    userId: string;
    adminUnreadCount: number;
    userUnreadCount: number;
    lastMessage: string;
    lastMessageAt: string;
    createdAt: string;
    // populated on admin list
    user?: { _id: string; name: string; email: string };
}

export interface Message {
    _id: string;
    conversationId: string;
    senderId: string;
    senderRole: 'user' | 'admin';
    senderName?: string; // populated on fetch
    text: string | null;
    attachmentUrl: string | null;
    attachmentName: string | null;
    attachmentType: 'image' | 'document' | null;
    read: boolean;
    createdAt: string;
}

export type WsIncoming =
    | { type: 'send_message'; conversationId: string; text?: string; fileUrl?: string; fileName?: string; fileType?: 'image' | 'document' }
    | { type: 'mark_read'; conversationId: string };

export type WsOutgoing =
    | { type: 'new_message'; message: Message }
    | { type: 'unread_update'; conversationId: string; unreadCount: number }
    | { type: 'error'; code: number; message: string };
