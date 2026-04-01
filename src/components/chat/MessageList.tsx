'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1 bg-gray-900">
            {messages.map((message) => {
                const isOwn = message.senderId === currentUserId;
                const time = new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                });

                return (
                    <div
                        key={message._id}
                        className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                        <span className="text-xs text-gray-400">
                            {message.senderName ?? (isOwn ? 'You' : 'Unknown')}
                        </span>
                        <div
                            className={`rounded-lg px-3 py-2 text-sm flex flex-col gap-1 ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
                                }`}
                        >
                            {message.attachmentType === 'image' && message.attachmentUrl && (
                                <img
                                    src={message.attachmentUrl}
                                    alt={message.attachmentName ?? 'attachment'}
                                    className="max-w-48 rounded"
                                />
                            )}
                            {message.attachmentType === 'document' && message.attachmentUrl && (
                                <a
                                    href={message.attachmentUrl}
                                    download={message.attachmentName ?? true}
                                    className="underline text-blue-300 hover:text-blue-200"
                                >
                                    {message.attachmentName ?? 'Download'}
                                </a>
                            )}
                            {message.text && <span>{message.text}</span>}
                        </div>
                        <span className="text-xs text-gray-500">{time}</span>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}
