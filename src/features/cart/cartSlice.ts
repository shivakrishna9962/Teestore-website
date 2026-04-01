import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/store';
import type { CartItem } from '@/types/cart';

interface CartState {
    items: CartItem[];
    discountCode: string | null;
    discountAmount: number;
    loading: boolean;
    error: string | null;
}

const initialState: CartState = {
    items: [],
    discountCode: null,
    discountAmount: 0,
    loading: false,
    error: null,
};

// Async thunks
export const fetchCart = createAsyncThunk('cart/fetchCart', async () => {
    const res = await fetch('/api/cart');
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
});

export const addToCart = createAsyncThunk(
    'cart/addToCart',
    async (payload: { productId: string; size: string; color: string }) => {
        const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to add to cart');
        return res.json();
    }
);

export const updateCartItem = createAsyncThunk(
    'cart/updateCartItem',
    async (payload: { itemId: string; quantity: number }) => {
        const res = await fetch(`/api/cart/${payload.itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: payload.quantity }),
        });
        if (!res.ok) throw new Error('Failed to update cart item');
        return res.json();
    }
);

export const removeCartItem = createAsyncThunk(
    'cart/removeCartItem',
    async (itemId: string) => {
        const res = await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to remove cart item');
        return res.json();
    }
);

export const applyDiscount = createAsyncThunk(
    'cart/applyDiscount',
    async (code: string) => {
        const res = await fetch('/api/cart/discount', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!res.ok) throw new Error('Invalid or expired discount code');
        return res.json();
    }
);

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        setCart(
            state,
            action: PayloadAction<{ items: CartItem[]; discountCode?: string; discountAmount: number }>
        ) {
            state.items = action.payload.items;
            state.discountCode = action.payload.discountCode ?? null;
            state.discountAmount = action.payload.discountAmount;
        },
        clearCart(state) {
            state.items = [];
            state.discountCode = null;
            state.discountAmount = 0;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
    },
    extraReducers: (builder) => {
        // fetchCart
        builder.addCase(fetchCart.pending, (state) => { state.loading = true; state.error = null; });
        builder.addCase(fetchCart.fulfilled, (state, action) => {
            state.loading = false;
            const cart = action.payload.cart ?? action.payload;
            state.items = cart.items ?? [];
            state.discountCode = cart.discountCode ?? null;
            state.discountAmount = cart.discountAmount ?? 0;
        });
        builder.addCase(fetchCart.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Failed to fetch cart';
        });

        // addToCart
        builder.addCase(addToCart.pending, (state) => { state.loading = true; state.error = null; });
        builder.addCase(addToCart.fulfilled, (state, action) => {
            state.loading = false;
            const cart = action.payload.cart ?? action.payload;
            state.items = cart.items ?? [];
            state.discountCode = cart.discountCode ?? null;
            state.discountAmount = cart.discountAmount ?? 0;
        });
        builder.addCase(addToCart.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Failed to add to cart';
        });

        // updateCartItem
        builder.addCase(updateCartItem.pending, (state) => { state.loading = true; state.error = null; });
        builder.addCase(updateCartItem.fulfilled, (state, action) => {
            state.loading = false;
            const cart = action.payload.cart ?? action.payload;
            state.items = cart.items ?? [];
            state.discountCode = cart.discountCode ?? null;
            state.discountAmount = cart.discountAmount ?? 0;
        });
        builder.addCase(updateCartItem.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Failed to update cart item';
        });

        // removeCartItem
        builder.addCase(removeCartItem.pending, (state) => { state.loading = true; state.error = null; });
        builder.addCase(removeCartItem.fulfilled, (state, action) => {
            state.loading = false;
            const cart = action.payload.cart ?? action.payload;
            state.items = cart.items ?? [];
            state.discountCode = cart.discountCode ?? null;
            state.discountAmount = cart.discountAmount ?? 0;
        });
        builder.addCase(removeCartItem.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Failed to remove cart item';
        });

        // applyDiscount
        builder.addCase(applyDiscount.pending, (state) => { state.loading = true; state.error = null; });
        builder.addCase(applyDiscount.fulfilled, (state, action) => {
            state.loading = false;
            state.discountCode = action.payload.discountCode ?? null;
            state.discountAmount = action.payload.discountAmount ?? 0;
            if (action.payload.items) state.items = action.payload.items;
        });
        builder.addCase(applyDiscount.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Failed to apply discount';
        });
    },
});

export const { setCart, clearCart, setLoading, setError } = cartSlice.actions;
export default cartSlice.reducer;

// Selector: compute cart totals
export const selectCartTotals = (state: RootState) => {
    const { items, discountAmount } = state.cart;
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxes = Math.round(subtotal * 0.1);
    const shippingCost = items.length > 0 ? 500 : 0;
    const total = subtotal + taxes + shippingCost - discountAmount;
    return { subtotal, taxes, shippingCost, discountAmount, total };
};
