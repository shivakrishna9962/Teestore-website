'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { selectCartTotals, clearCart } from '@/features/cart/cartSlice';
import { formatPrice } from '@/lib/helpers';
import CheckoutStepper from '@/components/CheckoutStepper';

interface Address {
    _id?: string;
    fullName: string; addressLine1: string; addressLine2: string;
    city: string; postalCode: string; country: string; isDefault?: boolean;
}

const DELIVERY_OPTIONS = [
    { id: 'standard', label: 'Standard', desc: '5-7 business days', price: 0 },
    { id: 'express', label: 'Express', desc: '2-3 business days', price: 999 },
    { id: 'overnight', label: 'Overnight', desc: '1 business day', price: 1999 },
];

const EMPTY_ADDRESS: Address = { fullName: '', addressLine1: '', addressLine2: '', city: '', postalCode: '', country: '' };

function AddressForm({ initial, onSave, onCancel, saving }: {
    initial: Address;
    onSave: (a: Address, setDefault: boolean) => void;
    onCancel?: () => void;
    saving: boolean;
}) {
    const [form, setForm] = useState<Address>(initial);
    const [setDefault, setSetDefault] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});

    function validate() {
        const e: Partial<Record<keyof Address, string>> = {};
        if (!form.fullName.trim()) e.fullName = 'Required';
        if (!form.addressLine1.trim()) e.addressLine1 = 'Required';
        if (!form.city.trim()) e.city = 'Required';
        if (!form.postalCode.trim()) e.postalCode = 'Required';
        if (!form.country.trim()) e.country = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    const fields: { key: keyof Address; label: string; required: boolean }[] = [
        { key: 'fullName', label: 'Full Name', required: true },
        { key: 'addressLine1', label: 'Address Line 1', required: true },
        { key: 'addressLine2', label: 'Address Line 2', required: false },
        { key: 'city', label: 'City', required: true },
        { key: 'postalCode', label: 'Postal Code', required: true },
        { key: 'country', label: 'Country', required: true },
    ];

    return (
        <div className="flex flex-col gap-3">
            {fields.map(({ key, label, required }) => (
                <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}{required && <span className="text-red-500"> *</span>}
                    </label>
                    <input type="text" value={form[key] as string}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors[key] ? 'border-red-400' : 'border-gray-300'}`} />
                    {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                </div>
            ))}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} />
                Set as default address
            </label>
            <div className="flex gap-3 mt-2">
                {onCancel && (
                    <button type="button" onClick={onCancel}
                        className="flex-1 border border-gray-300 py-2.5 rounded font-semibold text-sm hover:bg-gray-50">
                        Cancel
                    </button>
                )}
                <button type="button" disabled={saving}
                    onClick={() => { if (validate()) onSave(form, setDefault); }}
                    className="flex-1 bg-black text-white py-2.5 rounded font-semibold text-sm hover:bg-gray-800 disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Address'}
                </button>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const { items } = useAppSelector((s) => s.cart);
    const totals = useAppSelector(selectCartTotals);

    const buyNowProductId = searchParams.get('productId');
    const buyNowSize = searchParams.get('size');
    const buyNowColor = searchParams.get('color');
    const buyNowQty = parseInt(searchParams.get('quantity') ?? '1', 10);
    const isBuyNow = !!buyNowProductId;

    const [buyNowProduct, setBuyNowProduct] = useState<{ title: string; price: number } | null>(null);

    useEffect(() => {
        if (!isBuyNow) return;
        fetch(`/api/products/${buyNowProductId}`)
            .then((r) => r.json())
            .then((d) => setBuyNowProduct(d.product ?? d))
            .catch(() => { });
    }, [isBuyNow, buyNowProductId]);

    const checkoutItems = isBuyNow && buyNowProduct
        ? [{ _id: 'buynow', product: buyNowProductId!, size: buyNowSize!, color: buyNowColor!, quantity: buyNowQty, unitPrice: buyNowProduct.price }]
        : items;
    const checkoutSubtotal = isBuyNow && buyNowProduct ? buyNowProduct.price * buyNowQty : totals.subtotal;
    const checkoutTaxes = Math.round(checkoutSubtotal * 0.1);
    const checkoutDiscount = isBuyNow ? 0 : totals.discountAmount;

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [addrSaving, setAddrSaving] = useState(false);
    const [addrLoading, setAddrLoading] = useState(true);

    const [orderId, setOrderId] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [delivery, setDelivery] = useState('standard');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [placing, setPlacing] = useState(false);

    useEffect(() => {
        fetch('/api/user/addresses')
            .then((r) => r.json())
            .then((d) => {
                const addrs: Address[] = d.addresses ?? [];
                setAddresses(addrs);
                if (addrs.length > 0) {
                    const def = addrs.find((a) => a.isDefault) ?? addrs[0];
                    setSelectedAddressId(def._id ?? null);
                    setStep(2);
                }
            })
            .catch(() => { })
            .finally(() => setAddrLoading(false));
    }, []);

    async function handleSaveAddress(form: Address, setDefault: boolean) {
        setAddrSaving(true);
        try {
            let d: any;
            if (editingAddress?._id) {
                const res = await fetch(`/api/user/addresses/${editingAddress._id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, setDefault }),
                });
                d = await res.json();
            } else {
                const res = await fetch('/api/user/addresses', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, setDefault }),
                });
                d = await res.json();
                const newAddr = d.addresses?.[d.addresses.length - 1];
                if (newAddr) setSelectedAddressId(newAddr._id);
            }
            setAddresses(d.addresses ?? []);
            setShowAddForm(false);
            setEditingAddress(null);
            if (step === 1) setStep(2);
        } finally {
            setAddrSaving(false);
        }
    }

    async function handleDeleteAddress(id: string) {
        const res = await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' });
        const d = await res.json();
        const addrs: Address[] = d.addresses ?? [];
        setAddresses(addrs);
        if (selectedAddressId === id) {
            const def = addrs.find((a) => a.isDefault) ?? addrs[0];
            setSelectedAddressId(def?._id ?? null);
        }
        if (addrs.length === 0) setStep(1);
    }

    async function handleStep3() {
        setStep(3);
        try {
            const res = await fetch('/api/checkout/session', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deliveryMethod: delivery }),
            });
            if (res.ok) { const d = await res.json(); setClientSecret(d.clientSecret); }
        } catch { /* non-blocking */ }
    }

    async function handlePlaceOrder() {
        setPlacing(true);
        setOrderError(null);
        try {
            const selectedAddr = addresses.find((a) => a._id === selectedAddressId);
            if (!selectedAddr) throw new Error('Please select a shipping address.');
            const deliveryOption = DELIVERY_OPTIONS.find((o) => o.id === delivery);
            const body: any = {
                shippingAddress: selectedAddr,
                deliveryMethod: deliveryOption?.label,
                paymentIntentId: clientSecret ?? 'mock',
            };
            if (isBuyNow && buyNowProductId) {
                body.buyNowItem = { productId: buyNowProductId, size: buyNowSize, color: buyNowColor, quantity: buyNowQty };
            }
            const res = await fetch('/api/checkout/confirm', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Order failed'); }
            const data = await res.json();
            if (!isBuyNow) dispatch(clearCart());
            setOrderId(data.orderId ?? data._id);
        } catch (err: any) {
            setOrderError(err.message ?? 'Something went wrong.');
        } finally {
            setPlacing(false);
        }
    }

    const deliveryOption = DELIVERY_OPTIONS.find((o) => o.id === delivery);
    const deliveryCost = deliveryOption?.price ?? 0;
    const grandTotal = checkoutSubtotal + checkoutTaxes + deliveryCost - checkoutDiscount;
    const selectedAddr = addresses.find((a) => a._id === selectedAddressId);

    if (addrLoading) {
        return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin" /></div>;
    }

    if (orderId) {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Placed!</h1>
                <p className="text-gray-500 mb-2">Your order has been confirmed successfully.</p>
                <p className="text-sm text-gray-400 mb-8">Order ID: <span className="font-mono text-gray-600">{orderId.slice(-8).toUpperCase()}</span></p>
                <div className="flex gap-3 justify-center">
                    <a href="/orders" className="bg-black text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-gray-800 transition-colors">
                        View My Orders
                    </a>
                    <a href="/products" className="border border-gray-300 px-6 py-3 rounded-full font-semibold text-sm hover:bg-gray-50 transition-colors">
                        Continue Shopping
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>
            <CheckoutStepper currentStep={step} />

            {step === 1 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
                    <AddressForm initial={EMPTY_ADDRESS} onSave={handleSaveAddress} saving={addrSaving} />
                </div>
            )}

            {step === 2 && (
                <div className="flex flex-col gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Shipping Address</h2>
                            <button onClick={() => { setShowAddForm(true); setEditingAddress(null); }}
                                className="text-sm text-black underline hover:no-underline">+ Add new</button>
                        </div>
                        {showAddForm && (
                            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                                <p className="text-sm font-semibold mb-3">New Address</p>
                                <AddressForm initial={EMPTY_ADDRESS} onSave={handleSaveAddress}
                                    onCancel={() => setShowAddForm(false)} saving={addrSaving} />
                            </div>
                        )}
                        <div className="flex flex-col gap-3">
                            {addresses.map((addr) => (
                                <div key={addr._id} onClick={() => setSelectedAddressId(addr._id ?? null)}
                                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === addr._id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-3">
                                            <input type="radio" readOnly checked={selectedAddressId === addr._id} className="mt-1 cursor-pointer" />
                                            <div className="text-sm">
                                                <p className="font-semibold text-gray-900">
                                                    {addr.fullName}
                                                    {addr.isDefault && <span className="ml-2 text-xs bg-black text-white px-1.5 py-0.5 rounded">Default</span>}
                                                </p>
                                                <p className="text-gray-600">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                                                <p className="text-gray-600">{addr.city}, {addr.postalCode}, {addr.country}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 text-xs shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingAddress(addr); setShowAddForm(false); }}
                                                className="text-gray-500 hover:text-black underline">Edit</button>
                                            <button onClick={(e) => { e.stopPropagation(); addr._id && handleDeleteAddress(addr._id); }}
                                                className="text-red-500 hover:text-red-700 underline">Delete</button>
                                        </div>
                                    </div>
                                    {editingAddress?._id === addr._id && (
                                        <div className="mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                                            <AddressForm initial={editingAddress!} onSave={handleSaveAddress}
                                                onCancel={() => setEditingAddress(null)} saving={addrSaving} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Delivery Method</h2>
                        <div className="flex flex-col gap-3">
                            {DELIVERY_OPTIONS.map((opt) => (
                                <label key={opt.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${delivery === opt.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="delivery" value={opt.id} checked={delivery === opt.id} onChange={() => setDelivery(opt.id)} />
                                        <div>
                                            <p className="font-medium text-gray-900">{opt.label}</p>
                                            <p className="text-sm text-gray-500">{opt.desc}</p>
                                        </div>
                                    </div>
                                    <span className="font-semibold text-gray-900">{opt.price === 0 ? 'Free' : formatPrice(opt.price)}</span>
                                </label>
                            ))}
                        </div>
                        <button onClick={handleStep3} disabled={!selectedAddressId}
                            className="mt-6 w-full bg-black text-white py-3 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
                            Continue to Payment
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-2">Payment</h2>
                    <p className="text-sm text-gray-500 mb-4">Enter your card details to complete the purchase.</p>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                            <input type="text" placeholder="1234 5678 9012 3456" maxLength={19} value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (MM/YY)</label>
                                <input type="text" placeholder="MM/YY" maxLength={5} value={cardExpiry}
                                    onChange={(e) => setCardExpiry(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                                <input type="text" placeholder="123" maxLength={4} value={cardCvc}
                                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 py-3 rounded font-semibold hover:bg-gray-50 transition-colors">Back</button>
                        <button onClick={() => setStep(4)} className="flex-1 bg-black text-white py-3 rounded font-semibold hover:bg-gray-800 transition-colors">Review Order</button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4">Order Review</h2>
                    {selectedAddr && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg text-sm">
                            <p className="font-semibold mb-1">Shipping to:</p>
                            <p>{selectedAddr.fullName}, {selectedAddr.addressLine1}{selectedAddr.addressLine2 ? `, ${selectedAddr.addressLine2}` : ''}, {selectedAddr.city}, {selectedAddr.postalCode}, {selectedAddr.country}</p>
                            <p className="mt-2 font-semibold">Delivery: <span className="font-normal">{deliveryOption?.label} ({deliveryOption?.desc})</span></p>
                        </div>
                    )}
                    <div className="mb-4">
                        <p className="font-semibold text-sm mb-2">Items ({checkoutItems.length})</p>
                        {checkoutItems.map((item) => (
                            <div key={item._id} className="flex justify-between text-sm text-gray-700 py-1 border-b last:border-0">
                                <span>Product x{item.quantity} ({item.size}, {item.color})</span>
                                <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="text-sm flex flex-col gap-1 mb-4">
                        <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(checkoutSubtotal)}</span></div>
                        <div className="flex justify-between"><span>Taxes (10%)</span><span>{formatPrice(checkoutTaxes)}</span></div>
                        <div className="flex justify-between"><span>Shipping</span><span>{deliveryCost === 0 ? 'Free' : formatPrice(deliveryCost)}</span></div>
                        {checkoutDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(checkoutDiscount)}</span></div>}
                        <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>{formatPrice(grandTotal)}</span></div>
                    </div>
                    {orderError && <p className="text-sm text-red-600 mb-3">{orderError}</p>}
                    <div className="flex gap-3">
                        <button onClick={() => setStep(3)} className="flex-1 border border-gray-300 py-3 rounded font-semibold hover:bg-gray-50 transition-colors">Back</button>
                        <button onClick={handlePlaceOrder} disabled={placing}
                            className="flex-1 bg-black text-white py-3 rounded font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors">
                            {placing ? 'Placing Order...' : 'Place Order'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
