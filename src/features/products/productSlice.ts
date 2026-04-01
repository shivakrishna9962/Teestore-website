import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/store';
import type { Product } from '@/types/product';

interface ProductFilters {
    category: string;
    sizes: string[];
    colors: string[];
    minPrice: number | null;
    maxPrice: number | null;
}

interface ProductsState {
    searchQuery: string;
    filters: ProductFilters;
    sort: string;
    page: number;
    products: Product[];
    total: number;
    pages: number;
    loading: boolean;
}

const initialState: ProductsState = {
    searchQuery: '',
    filters: {
        category: '',
        sizes: [],
        colors: [],
        minPrice: null,
        maxPrice: null,
    },
    sort: 'newest',
    page: 1,
    products: [],
    total: 0,
    pages: 0,
    loading: false,
};

export const fetchProducts = createAsyncThunk(
    'products/fetchProducts',
    async (_, { getState }) => {
        const state = getState() as RootState;
        const { searchQuery, filters, sort, page } = state.products;

        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (filters.category) params.set('category', filters.category);
        if (filters.sizes.length) params.set('sizes', filters.sizes.join(','));
        if (filters.colors.length) params.set('colors', filters.colors.join(','));
        if (filters.minPrice !== null) params.set('minPrice', String(filters.minPrice));
        if (filters.maxPrice !== null) params.set('maxPrice', String(filters.maxPrice));
        if (sort) params.set('sort', sort);
        params.set('page', String(page));

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
    }
);

const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        setSearchQuery(state, action: PayloadAction<string>) {
            state.searchQuery = action.payload;
            state.page = 1;
        },
        setFilters(state, action: PayloadAction<Partial<ProductFilters>>) {
            state.filters = { ...state.filters, ...action.payload };
            state.page = 1;
        },
        setSort(state, action: PayloadAction<string>) {
            state.sort = action.payload;
            state.page = 1;
        },
        setPage(state, action: PayloadAction<number>) {
            state.page = action.payload;
        },
        resetFilters(state) {
            state.filters = initialState.filters;
            state.searchQuery = '';
            state.sort = 'newest';
            state.page = 1;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchProducts.pending, (state) => { state.loading = true; });
        builder.addCase(fetchProducts.fulfilled, (state, action) => {
            state.loading = false;
            state.products = action.payload.products ?? [];
            state.total = action.payload.total ?? 0;
            state.pages = action.payload.pages ?? 0;
        });
        builder.addCase(fetchProducts.rejected, (state) => { state.loading = false; });
    },
});

export const { setSearchQuery, setFilters, setSort, setPage, resetFilters } = productsSlice.actions;
export default productsSlice.reducer;
