'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';

type Tab = 'email' | 'mobile';
type MobileStep = 'phone' | 'otp';

interface MobileErrors {
    phone?: string;
    otp?: string;
    general?: string;
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') ?? '/';
    const registered = searchParams.get('registered') === '1';

    // Tab state
    const [activeTab, setActiveTab] = useState<Tab>('email');

    // Email form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    // Mobile form state
    const [mobileNumber, setMobileNumber] = useState('');
    const [mobileStep, setMobileStep] = useState<MobileStep>('phone');
    const [mobileErrors, setMobileErrors] = useState<MobileErrors>({});
    const [mobileLoading, setMobileLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [enteredOtp, setEnteredOtp] = useState('');

    // ── Email flow ──────────────────────────────────────────────────────────

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = await signIn('credentials', {
                redirect: false,
                email,
                password,
                callbackUrl,
            });
            if (result?.error) {
                setError('Invalid email or password.');
            } else {
                router.push(callbackUrl);
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogle() {
        setGoogleLoading(true);
        await signIn('google', { callbackUrl });
    }

    // ── Mobile flow ─────────────────────────────────────────────────────────

    async function handleSendOtp(e: React.FormEvent) {
        e.preventDefault();
        if (!mobileNumber) {
            setMobileErrors({ phone: 'Mobile number is required' });
            return;
        }
        if (!/^\+\d{7,15}$/.test(mobileNumber)) {
            setMobileErrors({ phone: 'Invalid mobile number format' });
            return;
        }
        setMobileLoading(true);
        setMobileErrors({});
        try {
            const res = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobileNumber, purpose: 'login' }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 404) {
                    setMobileErrors({ phone: 'No account found for this number.' });
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
                callbackUrl,
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
                router.push(callbackUrl);
            }
        } catch {
            setMobileErrors({ otp: 'Something went wrong. Please try again.' });
        } finally {
            setOtpLoading(false);
        }
    }

    function handleTabChange(tab: Tab) {
        setActiveTab(tab);
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
                    <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="text-gray-500 mt-2 text-sm">Sign in to your account</p>
                </div>

                {registered && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        Account created! Please sign in.
                    </div>
                )}

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

                {/* Email login form */}
                {activeTab === 'email' && (
                    <>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <Link href="/reset-password" className="text-xs text-gray-500 hover:text-black hover:underline">
                                        Forgot password?
                                    </Link>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="Your password"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">or</div>
                        </div>

                        <button
                            onClick={handleGoogle}
                            disabled={googleLoading}
                            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                            </svg>
                            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                        </button>
                    </>
                )}

                {/* Mobile login form */}
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
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-black font-semibold hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
