'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/lib/store';
import {
    loadConversation,
    loadMessages,
    markConversationRead,
    selectConversations,
    selectMessages,
    sendMessageRest,
} from '@/features/chat/chatSlice';
import { useChat } from '@/hooks/useChat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChatWidget({ isOpen, onClose }: ChatWidgetProps) {
    const { data: session } = useSession();
    const dispatch = useDispatch<AppDispatch>();

    const [jwtToken, setJwtToken] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const conversations = useSelector(selectConversations);
    const conversation = conversations[0] ?? null;
    const conversationId = conversation?._id ?? null;
    const messages = useSelector((state: RootState) =>
        conversationId ? selectMessages(conversationId)(state) : []
    );

    // Fetch JWT token on mount (needed for WebSocket auth)
    useEffect(() => {
        if (!session) return;
        fetch('/api/chat/token')
            .then((res) => res.json())
            .then((data: { token?: string }) => {
                if (data.token) setJwtToken(data.token);
            })
            .catch(() => {/* silently ignore */ });
    }, [session]);

    // When opened: load conversation and mark as read
    useEffect(() => {
        if (!isOpen || !session) return;
        dispatch(loadConversation());
    }, [isOpen, session, dispatch]);

    // Load messages when conversationId becomes available
    useEffect(() => {
        if (!conversationId || !isOpen) return;
        dispatch(loadMessages(conversationId));
        dispatch(markConversationRead(conversationId));
    }, [conversationId, isOpen, dispatch]);

    const { sendMessage, isConnected } = useChat({
        token: isOpen ? jwtToken : null,
        conversationId,
        role: 'user',
    });

    function handleSend(text: string, file?: File) {
        if (!conversationId) return;
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
                    // Try WS first, fall back to REST
                    if (isConnected) {
                        sendMessage({
                            type: 'send_message',
                            conversationId,
                            text: text || undefined,
                            fileUrl: data.url,
                            fileName: data.name,
                            fileType: data.type,
                        });
                    } else {
                        dispatch(sendMessageRest({
                            conversationId,
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
            sendMessage({ type: 'send_message', conversationId, text });
        } else {
            dispatch(sendMessageRest({ conversationId, text }));
        }
    }

    // Hidden when not authenticated
    if (!session) return null;

    return (
        <>
            {isOpen && (
                <>
                    {/* Mobile: full-screen centered overlay */}
                    <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-sm h-[60vh] flex flex-col bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white text-sm">Chat with Support</span>
                                    {isConnected && <span className="w-2 h-2 rounded-full bg-green-400" title="Connected" />}
                                </div>
                                <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none" aria-label="Close chat">✕</button>
                            </div>
                            <div className="flex flex-col flex-1 overflow-hidden">
                                {uploadError && <div className="px-4 py-2 bg-red-900 text-red-200 text-xs">{uploadError}</div>}
                                <MessageList messages={messages} currentUserId={(session.user as { id?: string })?.id ?? ''} />
                            </div>
                            <MessageInput onSend={handleSend} disabled={!conversationId} />
                        </div>
                    </div>

                    {/* Desktop: floating bottom-right widget */}
                    <div className="hidden md:flex fixed bottom-6 right-6 z-50 flex-col bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
                        style={{ width: 380, height: 500 }}>
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-white text-sm">Chat with Support</span>
                                {isConnected && <span className="w-2 h-2 rounded-full bg-green-400" title="Connected" />}
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none" aria-label="Close chat">✕</button>
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                            {uploadError && <div className="px-4 py-2 bg-red-900 text-red-200 text-xs">{uploadError}</div>}
                            <MessageList messages={messages} currentUserId={(session.user as { id?: string })?.id ?? ''} />
                        </div>
                        <MessageInput onSend={handleSend} disabled={!conversationId} />
                    </div>
                </>
            )}
        </>
    );
}
