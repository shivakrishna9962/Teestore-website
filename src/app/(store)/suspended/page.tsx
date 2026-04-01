import Link from 'next/link';

export default function SuspendedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
                <div className="text-6xl mb-6">🚫</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Suspended</h1>
                <p className="text-gray-500 text-sm mb-6">
                    Your account has been suspended. If you believe this is a mistake, please contact our support team.
                </p>
                <a
                    href="mailto:support@example.com"
                    className="inline-block bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm"
                >
                    Contact Support
                </a>
                <div className="mt-4">
                    <Link href="/login" className="text-sm text-gray-500 hover:text-black hover:underline">
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
