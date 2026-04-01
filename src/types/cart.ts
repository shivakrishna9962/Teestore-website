export interface CartItem {
    _id?: string;
    product: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number; // in cents
}

export interface Cart {
    _id?: string;
    user: string;
    items: CartItem[];
    discountCode?: string;
    discountAmount: number; // in cents
    updatedAt?: Date;
}

export interface CartTotals {
    subtotal: number;
    taxes: number;
    shippingCost: number;
    discountAmount: number;
    total: number;
}
