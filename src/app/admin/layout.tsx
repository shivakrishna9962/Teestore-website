import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminChatNavItem from '@/components/chat/AdminChatNavItem';

const NAV_LINKS = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/products', label: 'Products', icon: '👕' },
    { href: '/admin/inventory', label: 'Inventory', icon: '📦' },
    { href: '/admin/orders', label: 'Orders', icon: '🛒' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
        redirect('/login');
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar — icon-only on mobile, full on md+ */}
            <aside className="w-12 md:w-56 shrink-0 bg-gray-900 text-white flex flex-col transition-all">
                <div className="px-2 md:px-5 py-6 border-b border-gray-700 flex items-center justify-center md:justify-start">
                    <Link href="/admin/dashboard" className="hidden md:block text-lg font-bold tracking-tight">
                        TeeStore Admin
                    </Link>
                    <Link href="/admin/dashboard" className="md:hidden text-xl font-bold">
                        T
                    </Link>
                </div>
                <nav className="flex-1 px-1 md:px-3 py-4 flex flex-col gap-1">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                            title={link.label}
                        >
                            <span className="text-lg">{link.icon}</span>
                            <span className="hidden md:inline">{link.label}</span>
                        </Link>
                    ))}
                    <AdminChatNavItem />
                </nav>
                <div className="px-2 md:px-5 py-4 border-t border-gray-700 flex justify-center md:justify-start">
                    <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors hidden md:block">
                        ← Back to Store
                    </Link>
                    <Link href="/" className="md:hidden text-gray-400 hover:text-white transition-colors text-lg" title="Back to Store">
                        ←
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
