import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import cartReducer from '@/features/cart/cartSlice';
import productsReducer from '@/features/products/productSlice';
import wishlistReducer from '@/features/wishlist/wishlistSlice';
import notificationsReducer from '@/features/notifications/notificationsSlice';
import chatReducer from '@/features/chat/chatSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        cart: cartReducer,
        products: productsReducer,
        wishlist: wishlistReducer,
        notifications: notificationsReducer,
        chat: chatReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
