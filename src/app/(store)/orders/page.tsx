import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatPrice } from '@/lib/helpers';
import { connectToDatabase } from '@/lib/db';
import OrderModel from '@/models/Order';

const STATUS_COLORS: Record<string, string> = {
    Confirmed: 'bg-blue-100 text-blue-700',
    Processing: 'bg-yellow-100 text-yellow-700',
    Shipped: 'bg-purple-100 text-purple-700',
    'Out for Delivery': 'bg-orange-100 text-orange-700',
    Delivered: 'bg-green-100 text-green-700',
};

export default async function OrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login?callbackUrl=/orders');

    const userId = (session.user as any)?.id;
    await connectToDatabase();
    const orders = await OrderModel.find({ user: userId })
        .populate('items.product', 'images')
        .sort({ createdAt: -1 })
        .lean() as any[];

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
            {orders.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-500 text-lg mb-4">You have no orders yet.</p>
                    <Link href="/products" className="inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors">Start Shopping</Link>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {orders.map((order) => {
                        const orderId = order._id.toString();
                        return (
                            <div key={orderId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                {/* Order header */}
                                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Order placed</p>
                                            <p>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Total</p>
                                            <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Ship to</p>
                                            <p>{order.shippingAddress?.fullName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                                        <p className="text-xs text-gray-400">#{orderId.slice(-8).toUpperCase()}</p>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="divide-y divide-gray-100">
                                    {order.items?.map((item: any, i: number) => {
                                        const img = item.product?.images?.[0] ?? null;
                                        return (
                                            <div key={i} className="flex gap-4 px-5 py-4">
                                                <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                                    {img ? (
                                                        <Image src={img} alt={item.title} fill className="object-cover" sizes="80px" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 text-sm leading-snug">{item.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Color: {item.color} &nbsp;|&nbsp; Size: {item.size}</p>
                                                    <p className="text-xs text-gray-500">Qty: {item.quantity} &nbsp;×&nbsp; {formatPrice(item.unitPrice)}</p>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-900 shrink-0">
                                                    {formatPrice(item.unitPrice * item.quantity)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                                    <div className="text-xs text-gray-500">
                                        {order.deliveryMethod} delivery &nbsp;·&nbsp; {order.shippingAddress?.city}, {order.shippingAddress?.country}
                                    </div>
                                    <Link href={`/orders/${orderId}`} className="text-xs font-semibold text-black underline hover:no-underline">
                                        View details
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}