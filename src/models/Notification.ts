import mongoose, { Schema, model, models } from 'mongoose';

const NotificationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: {
        type: String,
        enum: ['registration', 'order_confirmed', 'order_status_changed', 'password_reset', 'low_stock'],
        required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// TTL index: auto-delete notifications after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
// Index for fast per-user queries
NotificationSchema.index({ user: 1 });

const NotificationModel = models.Notification || model('Notification', NotificationSchema);
export default NotificationModel;
