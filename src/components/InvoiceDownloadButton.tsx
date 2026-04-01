'use client';

import { useState } from 'react';

interface InvoiceDownloadButtonProps {
    orderId: string;
}

export default function InvoiceDownloadButton({ orderId }: InvoiceDownloadButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleDownload() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/invoices/${orderId}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Failed to fetch invoice');
            }
            const data = await res.json();
            const pdfUrl = data.pdfUrl ?? data.url;
            if (!pdfUrl) throw new Error('Invoice URL not found');
            window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="inline-flex flex-col items-start gap-1">
            <button
                onClick={handleDownload}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Fetching invoice...
                    </>
                ) : (
                    <>
                        <span>📄</span>
                        Download Invoice
                    </>
                )}
            </button>
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                    <span>{error}</span>
                    <button
                        onClick={handleDownload}
                        className="underline hover:no-underline"
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
}
