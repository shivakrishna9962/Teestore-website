import { Schema, model, models } from 'mongoose';

const ConversationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminUnreadCount: { type: Number, default: 0 },
    userUnreadCount: { type: Number, default: 0 },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

ConversationSchema.index({ userId: 1 }, { unique: true });
ConversationSchema.index({ lastMessageAt: -1 });

const ConversationModel = models.Conversation || model('Conversation', ConversationSchema);
export default ConversationModel;
