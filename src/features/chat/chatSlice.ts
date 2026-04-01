import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/store';
import type { Conversation, Message } from '@/types/chat';

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Record<string, Message[]>;
    userUnreadCount: number;
    adminTotalUnread: number;
    loading: boolean;
    error: string | null;
}

const initialState: ChatState = {
    conversations: [],
    activeConversationId: null,
    messages: {},
    userUnreadCount: 0,
    adminTotalUnread: 0,
    loading: false,
    error: null,
};

export const loadConversation = createAsyncThunk('chat/loadConversation', async () => {
    const res = await fetch('/api/chat/conversation');
    if (!res.ok) throw new Error('Failed to load conversation');
    const data = await res.json() as { conversation: Conversation };
    return data.conversation;
});

export const loadMessages = createAsyncThunk('chat/loadMessages', async (conversationId: string) => {
    const res = await fetch(`/api/chat/conversation/${conversationId}/messages`);
    if (!res.ok) throw new Error('Failed to load messages');
    const data = await res.json() as { messages: Message[] };
    return { conversationId, messages: data.messages };
});

export const loadAdminConversations = createAsyncThunk('chat/loadAdminConversations', async () => {
    const res = await fetch('/api/chat/admin/conversations');
    if (!res.ok) throw new Error('Failed to load conversations');
    const data = await res.json() as { conversations: Conversation[] };
    return data.conversations;
});

export const markConversationRead = createAsyncThunk('chat/markConversationRead', async (conversationId: string) => {
    const res = await fetch(`/api/chat/conversation/${conversationId}/read`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to mark conversation as read');
    return conversationId;
});

export const uploadAttachment = createAsyncThunk('chat/uploadAttachment', async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to upload attachment');
    return res.json() as Promise<{ url: string; name: string; type: 'image' | 'document' }>;
});

export const sendMessageRest = createAsyncThunk(
    'chat/sendMessageRest',
    async (payload: {
        conversationId: string;
        text?: string;
        fileUrl?: string;
        fileName?: string;
        fileType?: 'image' | 'document';
    }) => {
        const res = await fetch(`/api/chat/conversation/${payload.conversationId}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: payload.text,
                fileUrl: payload.fileUrl,
                fileName: payload.fileName,
                fileType: payload.fileType,
            }),
        });
        if (!res.ok) throw new Error('Failed to send message');
        const data = await res.json() as { message: Message };
        return data.message;
    }
);

export const fetchUserUnreadCount = createAsyncThunk('chat/fetchUserUnreadCount', async () => {
    const res = await fetch('/api/chat/unread');
    if (!res.ok) throw new Error('Failed to fetch unread count');
    const data = await res.json() as { unreadCount: number };
    return data.unreadCount;
});

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        receiveMessage(state, action: PayloadAction<Message>) {
            const message = action.payload;
            const { conversationId } = message;
            if (!state.messages[conversationId]) {
                state.messages[conversationId] = [];
            }
            state.messages[conversationId].push(message);
            const convo = state.conversations.find((c) => c._id === conversationId);
            if (convo) {
                convo.lastMessage = message.text ?? message.attachmentName ?? '';
                convo.lastMessageAt = message.createdAt;
            }
        },
        updateUnreadCount(
            state,
            action: PayloadAction<{ conversationId: string; unreadCount: number; role: 'user' | 'admin' }>
        ) {
            const { conversationId, unreadCount, role } = action.payload;
            if (role === 'user') {
                state.userUnreadCount = unreadCount;
            } else {
                const convo = state.conversations.find((c) => c._id === conversationId);
                if (convo) {
                    convo.adminUnreadCount = unreadCount;
                }
                state.adminTotalUnread = state.conversations.reduce(
                    (sum, c) => sum + (c.adminUnreadCount ?? 0),
                    0
                );
            }
        },
        setActiveConversation(state, action: PayloadAction<string | null>) {
            state.activeConversationId = action.payload;
        },
    },
    extraReducers: (builder) => {
        // loadConversation
        builder.addCase(loadConversation.pending, (state) => { state.loading = true; state.error = null; });
        builder.addCase(loadConversation.fulfilled, (state, action) => {
            state.loading = false;
            state.conversations = [action.payload];
        });
        builder.addCase(loadConversation.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Unknown error';
        });

        // loadMessages
        builder.addCase(loadMessages.pending, (state) => { state.loading = true; state.error = null; });
        builder.addCase(loadMessages.fulfilled, (state, action) => {
            state.loading = false;
            const { conversationId, messages } = action.payload;
            state.messages[conversationId] = messages;
        });
        builder.addCase(loadMessages.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Unknown error';
        });

        // loadAdminConversations
        builder.addCase(loadAdminConversations.pending, (state) => { state.loading = true; state.error = null; });
        builder.addCase(loadAdminConversations.fulfilled, (state, action) => {
            state.loading = false;
            state.conversations = action.payload;
            state.adminTotalUnread = action.payload.reduce((sum, c) => sum + (c.adminUnreadCount ?? 0), 0);
        });
        builder.addCase(loadAdminConversations.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Unknown error';
        });

        // markConversationRead
        builder.addCase(markConversationRead.fulfilled, (state, action) => {
            const conversationId = action.payload;
            const convo = state.conversations.find((c) => c._id === conversationId);
            if (convo) {
                convo.adminUnreadCount = 0;
                convo.userUnreadCount = 0;
            }
            state.adminTotalUnread = state.conversations.reduce(
                (sum, c) => sum + (c.adminUnreadCount ?? 0),
                0
            );
        });

        // fetchUserUnreadCount
        builder.addCase(fetchUserUnreadCount.fulfilled, (state, action) => {
            state.userUnreadCount = action.payload;
        });

        // sendMessageRest — optimistically add message to state
        builder.addCase(sendMessageRest.fulfilled, (state, action) => {
            const message = action.payload;
            const { conversationId } = message;
            if (!state.messages[conversationId]) {
                state.messages[conversationId] = [];
            }
            // Avoid duplicates if WS also delivers it
            const exists = state.messages[conversationId].some((m) => m._id === message._id);
            if (!exists) {
                state.messages[conversationId].push(message);
            }
            const convo = state.conversations.find((c) => c._id === conversationId);
            if (convo) {
                convo.lastMessage = message.text ?? message.attachmentName ?? '';
                convo.lastMessageAt = message.createdAt;
            }
        });
    },
});

export const { receiveMessage, updateUnreadCount, setActiveConversation } = chatSlice.actions;
export default chatSlice.reducer;

// Selectors
export const selectConversations = (state: RootState) => state.chat.conversations;
export const selectActiveConversationId = (state: RootState) => state.chat.activeConversationId;
export const selectMessages = (conversationId: string) => (state: RootState) =>
    state.chat.messages[conversationId] ?? [];
export const selectUserUnreadCount = (state: RootState) => state.chat.userUnreadCount;
export const selectAdminTotalUnread = (state: RootState) => state.chat.adminTotalUnread;
export const selectChatLoading = (state: RootState) => state.chat.loading;
export const selectChatError = (state: RootState) => state.chat.error;
