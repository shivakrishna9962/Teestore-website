'use client';

import { useRef, useState } from 'react';

const ACCEPTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_LABEL = 'JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_LENGTH = 2000;

interface MessageInputProps {
    onSend: (text: string, file?: File) => void;
    disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
    const [inputText, setInputText] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        if (!file) return;

        if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
            setError(`Invalid file type. Accepted types: ${ACCEPTED_LABEL}`);
            e.target.value = '';
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError('File exceeds the 10 MB size limit.');
            e.target.value = '';
            return;
        }

        setError(null);
        setPendingFile(file);
    }

    function handleSend() {
        const trimmed = inputText.trim();

        if (!trimmed && !pendingFile) {
            setError('Please enter a message or attach a file.');
            return;
        }
        if (trimmed.length > MAX_TEXT_LENGTH) {
            setError(`Message exceeds ${MAX_TEXT_LENGTH} characters.`);
            return;
        }

        setError(null);
        onSend(trimmed, pendingFile ?? undefined);
        setInputText('');
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="flex flex-col gap-2 p-3 bg-gray-800 border-t border-gray-700">
            {pendingFile && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span>📎 {pendingFile.name}</span>
                    <button
                        onClick={() => {
                            setPendingFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-gray-400 hover:text-red-400 text-xs"
                        aria-label="Remove attachment"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="flex items-end gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-gray-200 text-xl pb-1"
                    aria-label="Attach file"
                    title="Attach file"
                >
                    📎
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_MIME_TYPES.join(',')}
                    className="hidden"
                    onChange={handleFileChange}
                />

                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Type a message…"
                    className="flex-1 resize-none rounded bg-gray-700 text-gray-100 placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <button
                    type="button"
                    onClick={handleSend}
                    disabled={disabled}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
                >
                    Send
                </button>
            </div>

            <div className="flex justify-between items-center min-h-[1rem]">
                {error ? (
                    <span className="text-xs text-red-400">{error}</span>
                ) : (
                    <span />
                )}
                <span className={`text-xs ${inputText.length > MAX_TEXT_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
                    {inputText.length}/{MAX_TEXT_LENGTH}
                </span>
            </div>
        </div>
    );
}
