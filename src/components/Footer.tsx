'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Brand */}
        <div>
          <h3 className="text-white font-bold text-xl mb-3">TeeStore</h3>
          <p className="text-sm text-gray-400">Premium T-shirts for every style. Quality you can feel.</p>
        </div>
        {/* Shop */}
        <div>
          <h4 className="text-white font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
            <li><Link href="/products?category=Casual+Wear" className="hover:text-white transition-colors">Casual Wear</Link></li>
            <li><Link href="/products?category=Special+Wear" className="hover:text-white transition-colors">Special Wear</Link></li>
            <li><Link href="/products?featured=true" className="hover:text-white transition-colors">Featured</Link></li>
          </ul>
        </div>
        {/* Help */}
        <div>
          <h4 className="text-white font-semibold mb-3">Help</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/orders" className="hover:text-white transition-colors">Track Order</Link></li>
            <li><Link href="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
            <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
          </ul>
        </div>
        {/* Newsletter */}
        <div>
          <h4 className="text-white font-semibold mb-3">Stay Updated</h4>
          <p className="text-sm text-gray-400 mb-3">Get the latest drops and offers.</p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-3 py-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-gray-500"
            />
            <button type="submit" className="px-4 py-2 bg-white text-black text-sm font-semibold rounded hover:bg-gray-200 transition-colors">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} TeeStore. All rights reserved.
      </div>
    </footer>
  );
}
