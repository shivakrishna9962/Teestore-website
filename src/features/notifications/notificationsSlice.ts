import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '@/types/notification';

interface NotificationsState {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
}

const initialState: NotificationsState = {
    notifications: [],
    unreadCount: 0,
    loading: false,
};

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async () => {
        const res = await fetch('/api/notifications');
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return res.json();
    }
);

export const fetchUnreadCount = createAsyncThunk(
    'notifications/fetchUnreadCount',
    async () => {
        const res = await fetch('/api/notifications?unreadOnly=true');
        if (!res.ok) throw new Error('Failed to fetch unread count');
        const data = await res.json();
        return (data.notifications ?? data).length as number;
    }
);

export const markNotificationsRead = createAsyncThunk(
    'notifications/markNotificationsRead',
    async () => {
        const res = await fetch('/api/notifications', { method: 'PUT' });
        if (!res.ok) throw new Error('Failed to mark notifications as read');
        return res.json();
    }
);

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setNotifications(state, action: PayloadAction<Notification[]>) {
            state.notifications = action.payload;
        },
        setUnreadCount(state, action: PayloadAction<number>) {
            state.unreadCount = action.payload;
        },
        markAllRead(state) {
            state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
            state.unreadCount = 0;
        },
    },
    extraReducers: (builder) => {
        // fetchNotifications
        builder.addCase(fetchNotifications.pending, (state) => { state.loading = true; });
        builder.addCase(fetchNotifications.fulfilled, (state, action) => {
            state.loading = false;
            state.notifications = action.payload.notifications ?? action.payload;
        });
        builder.addCase(fetchNotifications.rejected, (state) => { state.loading = false; });

        // fetchUnreadCount
        builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
            state.unreadCount = action.payload;
        });

        // markNotificationsRead
        builder.addCase(markNotificationsRead.fulfilled, (state) => {
            state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
            state.unreadCount = 0;
        });
    },
});

export const { setNotifications, setUnreadCount, markAllRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
