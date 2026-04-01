'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ConfirmForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const email = searchParams.get('email') ?? '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; general?: string }>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs: typeof errors = {};
        if (!password) errs.password = 'Password is required';
        else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
        if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        setErrors({});
        try {
            const res = await fetch('/api/auth/reset-password/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email, password }),
            });
            if (!res.ok) {
                const d = await res.json();
                setErrors({ general: d.error ?? 'Reset failed. The link may have expired.' });
                return;
            }
            setSuccess(true);
            setTimeout(() => router.push('/login'), 2000);
        } catch {
            setErrors({ general: 'Something went wrong. Please try again.' });
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <p className="text-gray-700 mb-4">Invalid or missing reset token.</p>
                    <Link href="/reset-password" className="text-black font-semibold hover:underline">Request a new link</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">New Password</h1>
                    <p className="text-gray-500 mt-2 text-sm">Choose a strong password</p>
                </div>

                {success ? (
                    <div className="text-center">
                        <div className="text-5xl mb-4">✅</div>
                        <p className="text-gray-700 font-medium">Password updated! Redirecting to sign in...</p>
                    </div>
                ) : (
                    <>
                        {errors.general && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errors.general}</div>
                        )}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="Min. 8 characters"
                                />
                                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="Repeat your password"
                                />
                                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordConfirmPage() {
    return (
        <Suspense>
            <ConfirmForm />
        </Suspense>
    );
}
