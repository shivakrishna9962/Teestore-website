'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/lib/store';
import {
    loadAdminConversations,
    loadMessages,
    markConversationRead,
    setActiveConversation,
    selectConversations,
    selectActiveConversationId,
    selectMessages,
    sendMessageRest,
} from '@/features/chat/chatSlice';
import { useChat } from '@/hooks/useChat';
import ConversationList from '@/components/chat/ConversationList';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';

export default function AdminChatPanel() {
    const { data: session } = useSession();
    const dispatch = useDispatch<AppDispatch>();

    const [jwtToken, setJwtToken] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const conversations = useSelector(selectConversations);
    const activeConversationId = useSelector(selectActiveConversationId);
    const messages = useSelector((state: RootState) =>
        activeConversationId ? selectMessages(activeConversationId)(state) : []
    );

    // Load all conversations on mount
    useEffect(() => {
        dispatch(loadAdminConversations());
    }, [dispatch]);

    // Fetch JWT token on mount
    useEffect(() => {
        if (!session) return;
        fetch('/api/chat/token')
            .then((res) => res.json())
            .then((data: { token?: string }) => {
                if (data.token) setJwtToken(data.token);
            })
            .catch(() => {/* silently ignore */ });
    }, [session]);

    const { sendMessage, isConnected } = useChat({
        token: jwtToken,
        conversationId: activeConversationId,
        role: 'admin',
    });

    function handleSelectConversation(conversationId: string) {
        dispatch(setActiveConversation(conversationId));
        dispatch(loadMessages(conversationId));
        dispatch(markConversationRead(conversationId));
    }

    function handleSend(text: string, file?: File) {
        if (!activeConversationId) return;
        setUploadError(null);

        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            fetch('/api/chat/upload', { method: 'POST', body: formData })
                .then((res) => {
                    if (!res.ok) throw new Error('Upload failed');
                    return res.json() as Promise<{ url: string; name: string; type: 'image' | 'document' }>;
                })
                .then((data) => {
                    if (isConnected) {
                        sendMessage({
                            type: 'send_message',
                            conversationId: activeConversationId,
                            text: text || undefined,
                            fileUrl: data.url,
                            fileName: data.name,
                            fileType: data.type,
                        });
                    } else {
                        dispatch(sendMessageRest({
                            conversationId: activeConversationId,
                            text: text || undefined,
                            fileUrl: data.url,
                            fileName: data.name,
                            fileType: data.type,
                        }));
                    }
                })
                .catch(() => {
                    setUploadError('File upload failed. Please try again.');
                });
            return;
        }

        if (isConnected) {
            sendMessage({ type: 'send_message', conversationId: activeConversationId, text });
        } else {
            dispatch(sendMessageRest({ conversationId: activeConversationId, text }));
        }
    }

    const currentUserId = (session?.user as { id?: string })?.id ?? '';

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            {/* Left column: conversation list */}
            <div className="w-80 shrink-0 flex flex-col border-r border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">Conversations</span>
                    {isConnected && (
                        <span className="w-2 h-2 rounded-full bg-green-400" title="Connected" />
                    )}
                </div>
                <ConversationList
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelect={handleSelectConversation}
                />
            </div>

            {/* Right column: messages */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
                {activeConversationId ? (
                    <>
                        {uploadError && (
                            <div className="px-4 py-2 bg-red-900 text-red-200 text-xs">
                                {uploadError}
                            </div>
                        )}
                        <MessageList messages={messages} currentUserId={currentUserId} />
                        <MessageInput
                            onSend={handleSend}
                            disabled={!activeConversationId}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                        Select a conversation to start chatting
                    </div>
                )}
            </div>
        </div>
    );
}
