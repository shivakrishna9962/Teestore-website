'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { fetchCart } from '@/features/cart/cartSlice';
import { fetchWishlist } from '@/features/wishlist/wishlistSlice';
import { fetchUnreadCount } from '@/features/notifications/notificationsSlice';
import { fetchUserUnreadCount, selectUserUnreadCount } from '@/features/chat/chatSlice';
import NotificationPanel from './NotificationPanel';
import ChatWidget from './chat/ChatWidget';

export default function Navbar() {
  const { data: session } = useSession();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);
  const wishlistCount = useAppSelector((s) => s.wishlist.productIds.length);
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const userUnreadCount = useAppSelector(selectUserUnreadCount);

  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Fetch data on mount when authenticated
  useEffect(() => {
    if (session?.user) {
      dispatch(fetchCart());
      dispatch(fetchWishlist());
      dispatch(fetchUnreadCount());
      dispatch(fetchUserUnreadCount());
    }
  }, [session, dispatch]);

  // Poll unread count every 30 seconds
  useEffect(() => {
    if (!session?.user) return;
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 30_000);
    return () => clearInterval(interval);
  }, [session, dispatch]);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <nav className="bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300">
            TeeStore
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex gap-6 items-center">
            <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
            <Link href="/products" className="hover:text-gray-300 transition-colors">Products</Link>
            <Link href="/products?category=casual" className="hover:text-gray-300 transition-colors">Categories</Link>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-1 hover:text-gray-300 transition-colors"
                aria-label="Notifications"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  {/* Mobile: fixed centered overlay */}
                  <div className="md:hidden fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/30"
                    onClick={() => setNotifOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
                      <NotificationPanel onClose={() => setNotifOpen(false)} />
                    </div>
                  </div>
                  {/* Desktop: dropdown */}
                  <div className="hidden md:block absolute right-0 mt-2 z-50">
                    <NotificationPanel onClose={() => setNotifOpen(false)} />
                  </div>
                </>
              )}
            </div>

            {/* Chat icon — only shown when authenticated */}
            {session?.user && (
              <div className="relative">
                <button
                  onClick={() => setChatOpen((v) => !v)}
                  className="relative p-1 hover:text-gray-300 transition-colors"
                  aria-label="Chat"
                >
                  <span className="text-xl">💬</span>
                  {userUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {userUnreadCount > 9 ? '9+' : userUnreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-1 hover:text-gray-300 transition-colors" aria-label="Wishlist">
              <span className="text-xl">♡</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative p-1 hover:text-gray-300 transition-colors" aria-label="Cart">
              <span className="text-xl">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Account dropdown */}
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-1 hover:text-gray-300 transition-colors"
              >
                <span className="text-sm">{session?.user?.name ?? 'Account'}</span>
                <span className="text-xs">▾</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white text-gray-900 rounded shadow-lg py-1 z-50">
                  {session?.user ? (
                    <>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setAccountOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/orders"
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setAccountOpen(false)}
                      >
                        Orders
                      </Link>
                      <button
                        onClick={() => { setAccountOpen(false); signOut({ callbackUrl: '/' }); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setAccountOpen(false)}
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setAccountOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <ChatWidget isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
