'use client';

import { useState } from 'react';

interface PhoneInputProps {
    value: string; // E.164 formatted, e.g. "+14155552671"
    onChange: (e164: string) => void;
    error?: string;
}

const COUNTRY_CODES = [
    { code: '+1', label: 'US (+1)', flag: '🇺🇸' },
    { code: '+44', label: 'UK (+44)', flag: '🇬🇧' },
    { code: '+91', label: 'IN (+91)', flag: '🇮🇳' },
    { code: '+92', label: 'PK (+92)', flag: '🇵🇰' },
    { code: '+971', label: 'AE (+971)', flag: '🇦🇪' },
    { code: '+61', label: 'AU (+61)', flag: '🇦🇺' },
    { code: '+49', label: 'DE (+49)', flag: '🇩🇪' },
    { code: '+33', label: 'FR (+33)', flag: '🇫🇷' },
];

function parseE164(e164: string): { countryCode: string; digits: string } {
    for (const c of COUNTRY_CODES) {
        if (e164.startsWith(c.code)) {
            return { countryCode: c.code, digits: e164.slice(c.code.length) };
        }
    }
    return { countryCode: COUNTRY_CODES[0].code, digits: e164.replace(/^\+?\d*/, '') };
}

export default function PhoneInput({ value, onChange, error }: PhoneInputProps) {
    const parsed = parseE164(value);
    const [countryCode, setCountryCode] = useState(parsed.countryCode);
    const [digits, setDigits] = useState(parsed.digits);

    function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const newCode = e.target.value;
        setCountryCode(newCode);
        if (digits.length >= 7 && digits.length <= 15) {
            onChange(newCode + digits);
        }
    }

    function handleDigitsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const stripped = e.target.value.replace(/\D/g, '');
        setDigits(stripped);
        if (stripped.length >= 7 && stripped.length <= 15) {
            onChange(countryCode + stripped);
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex gap-2">
                <select
                    value={countryCode}
                    onChange={handleCountryChange}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                    aria-label="Country code"
                >
                    {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                            {c.flag} {c.label}
                        </option>
                    ))}
                </select>
                <input
                    type="tel"
                    value={digits}
                    onChange={handleDigitsChange}
                    placeholder="Phone number"
                    inputMode="numeric"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    aria-label="Phone number"
                />
            </div>
            {error && (
                <p className="text-sm text-red-500" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
