'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const d = await res.json();
                setError(d.error ?? 'Failed to send reset email.');
                return;
            }
            setSubmitted(true);
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
                    <p className="text-gray-500 mt-2 text-sm">Enter your email to receive a reset link</p>
                </div>

                {submitted ? (
                    <div className="text-center">
                        <div className="text-5xl mb-4">📧</div>
                        <p className="text-gray-700 font-medium mb-2">Check your inbox</p>
                        <p className="text-sm text-gray-500 mb-6">
                            If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
                        </p>
                        <Link href="/login" className="text-black font-semibold hover:underline text-sm">Back to Sign In</Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                        )}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                        <p className="text-center text-sm text-gray-500 mt-6">
                            <Link href="/login" className="text-black font-semibold hover:underline">Back to Sign In</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
