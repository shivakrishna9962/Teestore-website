'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';

type LinkStep = 'idle' | 'phone' | 'otp';

interface LinkErrors {
    phone?: string;
    otp?: string;
    general?: string;
}

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const [linkStep, setLinkStep] = useState<LinkStep>('idle');
    const [mobileNumber, setMobileNumber] = useState('');
    const [linkErrors, setLinkErrors] = useState<LinkErrors>({});
    const [sendLoading, setSendLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [linked, setLinked] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login?callbackUrl=/profile');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 text-sm">Loading...</p>
            </div>
        );
    }

    if (!session) return null;

    const user = session.user as any;
    const existingMobile: string | undefined = user.mobileNumber;

    async function handleSendOtp(e: React.FormEvent) {
        e.preventDefault();
        if (!mobileNumber) {
            setLinkErrors({ phone: 'Mobile number is required.' });
            return;
        }
        if (!/^\+\d{7,15}$/.test(mobileNumber)) {
            setLinkErrors({ phone: 'Invalid mobile number format.' });
            return;
        }
        setSendLoading(true);
        setLinkErrors({});
        try {
            const res = await fetch('/api/user/mobile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobileNumber }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 409) {
                    setLinkErrors({ phone: 'This number is already linked to another account.' });
                } else if (res.status === 429) {
                    const wait = data.retryAfter ? ` Please wait ${data.retryAfter} seconds.` : '';
                    setLinkErrors({ phone: `Too many requests.${wait}` });
                } else {
                    setLinkErrors({ general: data.error ?? 'Failed to send code. Please try again.' });
                }
                return;
            }
            setLinkStep('otp');
        } catch {
            setLinkErrors({ general: 'Something went wrong. Please try again.' });
        } finally {
            setSendLoading(false);
        }
    }

    async function handleOtpComplete(otp: string) {
        setVerifyLoading(true);
        setLinkErrors({});
        try {
            const res = await fetch('/api/user/mobile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobileNumber, otp }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401) {
                    setLinkErrors({ otp: data.error ?? 'Incorrect code. Please try again.' });
                } else {
                    setLinkErrors({ general: data.error ?? 'Verification failed. Please try again.' });
                }
                return;
            }
            // Success — refresh session and show success state
            await update();
            setLinked(true);
            setLinkStep('idle');
        } catch {
            setLinkErrors({ otp: 'Something went wrong. Please try again.' });
        } finally {
            setVerifyLoading(false);
        }
    }

    function startLinking() {
        setLinkStep('phone');
        setMobileNumber('');
        setLinkErrors({});
        setLinked(false);
    }

    function cancelLinking() {
        setLinkStep('idle');
        setMobileNumber('');
        setLinkErrors({});
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

            {/* Account info card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                <div className="flex flex-col gap-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Name</span>
                        <span className="font-medium text-gray-900">{user.name ?? '—'}</span>
                    </div>
                    {user.email && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Email</span>
                            <span className="font-medium text-gray-900">{user.email}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-gray-500">Mobile number</span>
                        <span className="font-medium text-gray-900">
                            {existingMobile ?? (linked ? mobileNumber : '—')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Mobile number linking card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Mobile Number</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Link a mobile number to sign in with OTP or receive account notifications.
                </p>

                {/* Already linked */}
                {(existingMobile || linked) && linkStep === 'idle' && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        <span>✓</span>
                        <span>
                            Mobile number <span className="font-medium">{existingMobile ?? mobileNumber}</span> is linked to your account.
                        </span>
                    </div>
                )}

                {/* Not linked — idle state */}
                {!existingMobile && !linked && linkStep === 'idle' && (
                    <button
                        onClick={startLinking}
                        className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm"
                    >
                        Link Mobile Number
                    </button>
                )}

                {/* General error */}
                {linkErrors.general && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {linkErrors.general}
                    </div>
                )}

                {/* Step 1: Enter phone number */}
                {linkStep === 'phone' && (
                    <form onSubmit={handleSendOtp} className="flex flex-col gap-4" noValidate>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mobile Number
                            </label>
                            <PhoneInput
                                value={mobileNumber}
                                onChange={setMobileNumber}
                                error={linkErrors.phone}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={sendLoading}
                                className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors text-sm"
                            >
                                {sendLoading ? 'Sending code...' : 'Send Verification Code'}
                            </button>
                            <button
                                type="button"
                                onClick={cancelLinking}
                                className="px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 2: Enter OTP */}
                {linkStep === 'otp' && (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-gray-600 text-center">
                            Enter the 6-digit code sent to{' '}
                            <span className="font-medium text-gray-900">{mobileNumber}</span>
                        </p>
                        <div className="flex justify-center">
                            <OtpInput
                                onComplete={handleOtpComplete}
                                error={linkErrors.otp}
                                disabled={verifyLoading}
                            />
                        </div>
                        {verifyLoading && (
                            <p className="text-sm text-gray-500 text-center">Verifying...</p>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setLinkStep('phone');
                                setLinkErrors({});
                            }}
                            className="text-sm text-gray-500 hover:text-black text-center hover:underline"
                        >
                            ← Change number
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
