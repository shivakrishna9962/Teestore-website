import { Schema, model, models } from 'mongoose';

const MessageSchema = new Schema({
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['user', 'admin'], required: true },
    text: { type: String, default: null },
    attachmentUrl: { type: String, default: null },
    attachmentName: { type: String, default: null },
    attachmentType: { type: String, enum: ['image', 'document', null], default: null },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

MessageSchema.index({ conversationId: 1, createdAt: 1 });

const MessageModel = models.Message || model('Message', MessageSchema);
export default MessageModel;
