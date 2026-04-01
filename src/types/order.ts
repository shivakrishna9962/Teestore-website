export type OrderStatus =
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered';

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  product: string;
  title: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number; // in cents
}

export interface StatusEvent {
  status: OrderStatus;
  timestamp: Date;
  adminId?: string;
}

export interface Order {
  _id?: string;
  user: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  deliveryMethod: string;
  subtotal: number; // in cents
  taxes: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  paymentIntentId: string;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  trackingNumber?: string;
  carrier?: string;
  invoiceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
