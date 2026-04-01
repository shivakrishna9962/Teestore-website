import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatPrice } from '@/lib/helpers';
import InvoiceDownloadButton from '@/components/InvoiceDownloadButton';
import type { Order } from '@/types/order';

const STATUS_COLORS: Record<string, string> = {
  Confirmed: 'bg-blue-100 text-blue-700',
  Processing: 'bg-yellow-100 text-yellow-700',
  Shipped: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
};

async function getOrder(id: string): Promise<Order | null> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/orders/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.order ?? data;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order #{order._id?.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-gray-500 mt-1">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Product', 'Size', 'Color', 'Qty', 'Price'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items?.map((item, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-sm text-gray-900">{item.title}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.size}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.color}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{formatPrice(item.unitPrice * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Shipping Address</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>{order.shippingAddress?.fullName}</p>
            <p>{order.shippingAddress?.addressLine1}</p>
            {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
            <p>{order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
            <p>{order.shippingAddress?.country}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Payment Summary</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between"><span>Delivery</span><span>{order.deliveryMethod}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Taxes</span><span>{formatPrice(order.taxes)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(order.shippingCost)}</span></div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(order.discountAmount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </div>
      </div>

      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Status History</h2>
          <ol className="relative border-l border-gray-200 ml-3">
            {order.statusHistory.map((s: any, i: number) => (
              <li key={i} className="mb-4 ml-4">
                <div className="absolute w-3 h-3 bg-black rounded-full -left-1.5 border border-white" />
                <p className="text-sm font-semibold text-gray-900">{s.status}</p>
                <p className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleString()}</p>
                {s.note && <p className="text-xs text-gray-600 mt-0.5">{s.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex gap-3">
        <a href="/orders" className="border border-gray-300 px-5 py-2.5 rounded font-semibold text-sm hover:bg-gray-50 transition-colors">
          Back to Orders
        </a>
        {order.invoiceId && <InvoiceDownloadButton orderId={order._id ?? ''} />}
      </div>
    </div>
  );
}