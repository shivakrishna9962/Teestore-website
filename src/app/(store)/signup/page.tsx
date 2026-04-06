'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';

type Tab = 'email' | 'mobile';
type MobileStep = 'phone' | 'otp';

interface EmailFormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface EmailErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
}

interface MobileErrors {
    name?: string;
    phone?: string;
    otp?: string;
    general?: string;
}

export default function SignupPage() {
    const router = useRouter();

    // Tab state
    const [activeTab, setActiveTab] = useState<Tab>('email');

    // Email form state
    const [emailForm, setEmailForm] = useState<EmailFormData>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [emailErrors, setEmailErrors] = useState<EmailErrors>({});
    const [emailLoading, setEmailLoading] = useState(false);

    // Mobile form state
    const [mobileName, setMobileName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [mobileStep, setMobileStep] = useState<MobileStep>('phone');
    const [mobileErrors, setMobileErrors] = useState<MobileErrors>({});
    const [mobileLoading, setMobileLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [enteredOtp, setEnteredOtp] = useState('');

    // ── Email flow ──────────────────────────────────────────────────────────

    function validateEmail(): boolean {
        const errs: EmailErrors = {};
        if (!emailForm.name.trim()) errs.name = 'Name is required';
        if (!emailForm.email.trim()) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email))
            errs.email = 'Invalid email address';
        if (!emailForm.password) errs.password = 'Password is required';
        else if (emailForm.password.length < 8)
            errs.password = 'Password must be at least 8 characters';
        if (emailForm.password !== emailForm.confirmPassword)
            errs.confirmPassword = 'Passwords do not match';
        setEmailErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleEmailSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validateEmail()) return;
        setEmailLoading(true);
        setEmailErrors({});
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: emailForm.name,
                    email: emailForm.email,
                    password: emailForm.password,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setEmailErrors({ general: data.error ?? 'Registration failed. Please try again.' });
                return;
            }
            router.push('/login?registered=1');
        } catch {
            setEmailErrors({ general: 'Something went wrong. Please try again.' });
        } finally {
            setEmailLoading(false);
        }
    }

    // ── Mobile flow ─────────────────────────────────────────────────────────

    function validateMobilePhone(): boolean {
        const errs: MobileErrors = {};
        if (!mobileName.trim()) errs.name = 'Name is required';
        if (!mobileNumber) errs.phone = 'Mobile number is required';
        else if (!/^\+\d{7,15}$/.test(mobileNumber)) errs.phone = 'Invalid mobile number format';
        setMobileErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleSendOtp(e: React.FormEvent) {
        e.preventDefault();
        if (!validateMobilePhone()) return;
        setMobileLoading(true);
        setMobileErrors({});
        try {
            const res = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobileNumber, purpose: 'register' }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 409) {
                    setMobileErrors({ phone: 'This number is already registered. Please sign in.' });
                } else if (res.status === 429) {
                    const wait = data.retryAfter ? ` Please wait ${data.retryAfter} seconds.` : '';
                    setMobileErrors({ phone: `Too many requests.${wait}` });
                } else {
                    setMobileErrors({ general: data.error ?? 'Failed to send OTP. Please try again.' });
                }
                return;
            }
            setMobileStep('otp');
            setEnteredOtp('');
        } catch {
            setMobileErrors({ general: 'Something went wrong. Please try again.' });
        } finally {
            setMobileLoading(false);
        }
    }

    async function handleOtpComplete(otp: string) {
        setOtpLoading(true);
        setMobileErrors({});
        try {
            const result = await signIn('mobile-otp', {
                mobileNumber,
                otp,
                redirect: false,
            });
            if (result?.error) {
                const msg = result.error;
                if (msg.includes('expired')) {
                    setMobileErrors({ otp: 'Code has expired. Please request a new one.' });
                } else if (msg.includes('attempts')) {
                    setMobileErrors({ otp: 'Too many attempts. Please request a new code.' });
                } else {
                    setMobileErrors({ otp: 'Incorrect code. Please try again.' });
                }
            } else {
                router.push('/');
            }
        } catch {
            setMobileErrors({ otp: 'Something went wrong. Please try again.' });
        } finally {
            setOtpLoading(false);
        }
    }

    function handleTabChange(tab: Tab) {
        setActiveTab(tab);
        // Reset mobile state when switching tabs
        if (tab === 'email') {
            setMobileStep('phone');
            setMobileErrors({});
        }
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-500 mt-2 text-sm">Join us and start shopping</p>
                </div>

                {/* Tab toggle */}
                <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => handleTabChange('email')}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'email'
                            ? 'bg-black text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Email
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('mobile')}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'mobile'
                            ? 'bg-black text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Mobile
                    </button>
                </div>

                {/* Email registration form */}
                {activeTab === 'email' && (
                    <>
                        {emailErrors.general && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {emailErrors.general}
                            </div>
                        )}

                        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4" noValidate>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={emailForm.name}
                                    onChange={(e) => setEmailForm((f) => ({ ...f, name: e.target.value }))}
                                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${emailErrors.name ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="Your full name"
                                />
                                {emailErrors.name && <p className="text-xs text-red-500 mt-1">{emailErrors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={emailForm.email}
                                    onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))}
                                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${emailErrors.email ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="you@example.com"
                                />
                                {emailErrors.email && <p className="text-xs text-red-500 mt-1">{emailErrors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={emailForm.password}
                                    onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))}
                                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${emailErrors.password ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="Min. 8 characters"
                                />
                                {emailErrors.password && <p className="text-xs text-red-500 mt-1">{emailErrors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    value={emailForm.confirmPassword}
                                    onChange={(e) => setEmailForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${emailErrors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="Repeat your password"
                                />
                                {emailErrors.confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1">{emailErrors.confirmPassword}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={emailLoading}
                                className="mt-2 w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors"
                            >
                                {emailLoading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>
                    </>
                )}

                {/* Mobile registration form */}
                {activeTab === 'mobile' && (
                    <>
                        {mobileErrors.general && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {mobileErrors.general}
                            </div>
                        )}

                        {mobileStep === 'phone' && (
                            <form onSubmit={handleSendOtp} className="flex flex-col gap-4" noValidate>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={mobileName}
                                        onChange={(e) => setMobileName(e.target.value)}
                                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${mobileErrors.name ? 'border-red-400' : 'border-gray-300'}`}
                                        placeholder="Your full name"
                                    />
                                    {mobileErrors.name && (
                                        <p className="text-xs text-red-500 mt-1">{mobileErrors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                    <PhoneInput
                                        value={mobileNumber}
                                        onChange={setMobileNumber}
                                        error={mobileErrors.phone}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={mobileLoading}
                                    className="mt-2 w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors"
                                >
                                    {mobileLoading ? 'Sending code...' : 'Send Verification Code'}
                                </button>
                            </form>
                        )}

                        {mobileStep === 'otp' && (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-gray-600 text-center">
                                    Enter the 6-digit code sent to{' '}
                                    <span className="font-medium text-gray-900">{mobileNumber}</span>
                                </p>

                                <div className="flex justify-center">
                                    <OtpInput
                                        onComplete={(code) => setEnteredOtp(code)}
                                        error={mobileErrors.otp}
                                        disabled={otpLoading}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => enteredOtp.length === 6 && handleOtpComplete(enteredOtp)}
                                    disabled={otpLoading || enteredOtp.length < 6}
                                    className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors"
                                >
                                    {otpLoading ? 'Verifying...' : 'Verify Code'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileStep('phone');
                                        setMobileErrors({});
                                        setEnteredOtp('');
                                    }}
                                    className="text-sm text-gray-500 hover:text-black text-center hover:underline"
                                >
                                    ← Change number
                                </button>
                            </div>
                        )}
                    </>
                )}

                <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-black font-semibold hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
