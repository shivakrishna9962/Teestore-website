export type NotificationEvent =
    | 'registration'
    | 'order_confirmed'
    | 'order_status_changed'
    | 'password_reset'
    | 'low_stock';

export interface Notification {
    _id?: string;
    user: string;
    event: NotificationEvent;
    message: string;
    read: boolean;
    createdAt?: Date;
}
