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
            {/* Sidebar */}
            <aside className="w-56 shrink-0 bg-gray-900 text-white flex flex-col">
                <div className="px-5 py-6 border-b border-gray-700">
                    <Link href="/admin/dashboard" className="text-lg font-bold tracking-tight">
                        TeeStore Admin
                    </Link>
                </div>
                <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                            <span>{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
                    <AdminChatNavItem />
                </nav>
                <div className="px-5 py-4 border-t border-gray-700">
                    <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
                        ← Back to Store
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
