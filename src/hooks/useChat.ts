'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/lib/store';
import type { WsIncoming, WsOutgoing } from '@/types/chat';
import { receiveMessage, updateUnreadCount } from '@/features/chat/chatSlice';
import { loadMessages } from '@/features/chat/chatSlice';

interface UseChatParams {
    token: string | null | undefined;
    conversationId: string | null | undefined;
    role: 'user' | 'admin';
}

interface UseChatReturn {
    sendMessage: (data: WsIncoming) => void;
    isConnected: boolean;
}

export function useChat({ token, conversationId, role }: UseChatParams): UseChatReturn {
    const dispatch = useDispatch<AppDispatch>();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const attemptRef = useRef(0);
    const unmountedRef = useRef(false);
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(() => {
        if (!token || unmountedRef.current) return;

        const ws = new WebSocket(`ws://localhost:4000?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            if (unmountedRef.current) {
                ws.close();
                return;
            }
            attemptRef.current = 0;
            setIsConnected(true);

            // Fetch missed messages on reconnect (attempt > 0 means it's a reconnect)
            if (conversationId) {
                dispatch(loadMessages(conversationId));
            }
        };

        ws.onmessage = (event: MessageEvent) => {
            let data: WsOutgoing;
            try {
                data = JSON.parse(event.data as string) as WsOutgoing;
            } catch {
                return;
            }

            if (data.type === 'new_message') {
                dispatch(receiveMessage(data.message));
            } else if (data.type === 'unread_update') {
                dispatch(
                    updateUnreadCount({
                        conversationId: data.conversationId,
                        unreadCount: data.unreadCount,
                        role,
                    })
                );
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            if (unmountedRef.current) return;

            const attempt = attemptRef.current;
            const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
            attemptRef.current = attempt + 1;

            reconnectTimerRef.current = setTimeout(() => {
                if (!unmountedRef.current) {
                    connect();
                }
            }, delay);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [token, conversationId, role, dispatch]);

    useEffect(() => {
        unmountedRef.current = false;

        if (!token) return;

        connect();

        return () => {
            unmountedRef.current = true;

            if (reconnectTimerRef.current !== null) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [token, connect]);

    const sendMessage = useCallback((data: WsIncoming) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }, []);

    return { sendMessage, isConnected };
}
