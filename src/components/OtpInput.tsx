'use client';

import { useRef, useState, ClipboardEvent, KeyboardEvent } from 'react';

interface OtpInputProps {
    length?: number;
    onComplete: (code: string) => void;
    error?: string;
    disabled?: boolean;
}

export default function OtpInput({ length = 6, onComplete, error, disabled }: OtpInputProps) {
    const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    function focusAt(index: number) {
        inputRefs.current[index]?.focus();
    }

    function handleChange(index: number, value: string) {
        const digit = value.replace(/\D/g, '').slice(-1);
        const next = digits.map((d, i) => (i === index ? digit : d));
        setDigits(next);

        if (digit && index < length - 1) {
            focusAt(index + 1);
        }

        if (next.every((d) => d !== '')) {
            onComplete(next.join(''));
        }
    }

    function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            focusAt(index - 1);
        }
    }

    function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        if (!pasted) return;

        const next = Array(length).fill('');
        for (let i = 0; i < pasted.length; i++) {
            next[i] = pasted[i];
        }
        setDigits(next);

        const lastFilled = Math.min(pasted.length, length - 1);
        focusAt(lastFilled);

        if (next.every((d) => d !== '')) {
            onComplete(next.join(''));
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                {digits.map((digit, i) => (
                    <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={disabled}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        aria-label={`OTP digit ${i + 1}`}
                        className="w-10 h-12 text-center text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                ))}
            </div>
            {error && (
                <p className="text-sm text-red-500" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
