import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Footer from '@/components/Footer';
import type { Product } from '@/types/product';

async function fetchProducts(params: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${base}/api/products?${qs}`, { cache: 'no-store' });
  if (!res.ok) return { products: [] };
  return res.json();
}

const TESTIMONIALS = [
  { name: 'Alex M.', rating: 5, text: 'Amazing quality! The fabric is super soft and the fit is perfect. Will definitely order again.' },
  { name: 'Jordan K.', rating: 5, text: 'Fast shipping and the colors are exactly as shown. My new favorite tee brand.' },
  { name: 'Sam R.', rating: 5, text: 'Great value for money. The graphic tees are unique and I always get compliments.' },
];

export default async function HomePage() {
  const [newArrivals, casualWear, specialWear, featured] = await Promise.all([
    fetchProducts({ sort: 'newest', page: '1', limit: '8' }),
    fetchProducts({ category: 'Casual Wear', limit: '4' }),
    fetchProducts({ category: 'Special Wear', limit: '4' }),
    fetchProducts({ featured: 'true', limit: '8' }),
  ]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner */}
      <section className="relative min-h-[70vh] bg-gradient-to-r from-gray-900 to-gray-700 flex items-center justify-center text-center px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white uppercase tracking-tight mb-4">
            Turn Your Style Into a Statement
          </h1>
          <p className="text-xl text-gray-300 mb-8">Shop the latest T-shirt collections</p>
          <Link
            href="/products"
            className="inline-block bg-white text-black font-semibold px-8 py-4 rounded hover:bg-gray-100 transition-colors text-lg"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">New Arrivals</h2>
          <Link href="/products?sort=newest" className="text-sm font-medium text-gray-600 hover:text-black underline">View All</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(newArrivals.products ?? []).slice(0, 8).map((p: Product) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>

      {/* Category: Casual Wear */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Casual Wear</h2>
            <Link href="/products?category=Casual+Wear" className="text-sm font-medium text-gray-600 hover:text-black underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(casualWear.products ?? []).slice(0, 4).map((p: Product) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Category: Special Wear */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Special Wear</h2>
          <Link href="/products?category=Special+Wear" className="text-sm font-medium text-gray-600 hover:text-black underline">View All</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(specialWear.products ?? []).slice(0, 4).map((p: Product) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>

      {/* Featured / Trending */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Featured / Trending</h2>
            <Link href="/products?featured=true" className="text-sm font-medium text-gray-600 hover:text-black underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(featured.products ?? []).slice(0, 8).map((p: Product) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">What Our Customers Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-yellow-400 text-sm">{'★'.repeat(t.rating)}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
