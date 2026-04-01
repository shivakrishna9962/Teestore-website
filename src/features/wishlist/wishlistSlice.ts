import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/store';

interface WishlistState {
    productIds: string[];
    loading: boolean;
}

const initialState: WishlistState = {
    productIds: [],
    loading: false,
};

export const fetchWishlist = createAsyncThunk('wishlist/fetchWishlist', async () => {
    const res = await fetch('/api/wishlist');
    if (!res.ok) throw new Error('Failed to fetch wishlist');
    const data = await res.json();
    const products = data.wishlist?.products ?? data.products ?? [];
    return products.map((p: any) => (typeof p === 'string' ? p : String(p._id ?? p)));
});

export const toggleWishlist = createAsyncThunk(
    'wishlist/toggleWishlist',
    async (productId: string, { getState }) => {
        const state = getState() as RootState;
        const isWishlisted = state.wishlist.productIds.includes(productId);
        if (isWishlisted) {
            const res = await fetch(`/api/wishlist/${productId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to remove from wishlist');
            return { productId, action: 'removed' as const };
        } else {
            const res = await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            });
            if (!res.ok) throw new Error('Failed to add to wishlist');
            return { productId, action: 'added' as const };
        }
    }
);

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState,
    reducers: {
        setWishlist(state, action: PayloadAction<string[]>) {
            state.productIds = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
    },
    extraReducers: (builder) => {
        // fetchWishlist
        builder.addCase(fetchWishlist.pending, (state) => { state.loading = true; });
        builder.addCase(fetchWishlist.fulfilled, (state, action) => {
            state.loading = false;
            state.productIds = action.payload;
        });
        builder.addCase(fetchWishlist.rejected, (state) => { state.loading = false; });

        // toggleWishlist — optimistic update
        builder.addCase(toggleWishlist.pending, (state, action) => {
            const productId = action.meta.arg;
            const idx = state.productIds.indexOf(productId);
            if (idx >= 0) {
                state.productIds.splice(idx, 1);
            } else {
                state.productIds.push(productId);
            }
        });
        builder.addCase(toggleWishlist.rejected, (state, action) => {
            // Revert optimistic update on failure
            const productId = action.meta.arg;
            const idx = state.productIds.indexOf(productId);
            if (idx >= 0) {
                state.productIds.splice(idx, 1);
            } else {
                state.productIds.push(productId);
            }
        });
    },
});

export const { setWishlist, setLoading } = wishlistSlice.actions;
export default wishlistSlice.reducer;

// Selector
export const selectIsWishlisted = (productId: string) => (state: RootState): boolean =>
    state.wishlist.productIds.includes(productId);
