import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;

        // Redirect suspended users
        if (token?.status === 'suspended' && pathname !== '/suspended') {
            return NextResponse.redirect(new URL('/suspended', req.url));
        }

        // Admin routes require admin role
        if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
            if (token?.role !== 'admin') {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                return NextResponse.redirect(new URL('/login', req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized({ token, req }) {
                const { pathname } = req.nextUrl;
                // Protected shopper routes require any valid session
                const shopperRoutes = ['/wishlist', '/cart', '/checkout', '/orders'];
                const isShopperRoute = shopperRoutes.some((r) => pathname.startsWith(r));
                const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
                if (isShopperRoute || isAdminRoute) return !!token;
                return true;
            },
        },
        pages: {
            signIn: '/login',
        },
    }
);

export const config = {
    matcher: [
        '/wishlist/:path*',
        '/cart/:path*',
        '/checkout/:path*',
        '/orders/:path*',
        '/admin/:path*',
        '/api/admin/:path*',
    ],
};
