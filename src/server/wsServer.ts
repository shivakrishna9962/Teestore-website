import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local for local development
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import * as http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import * as jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { WsIncoming } from '../types/chat';

// ── Models ────────────────────────────────────────────────────────────────────
// Import models (they register themselves with mongoose)
import MessageModel from '../models/Message';
import ConversationModel from '../models/Conversation';

// ── In-memory maps ────────────────────────────────────────────────────────────
// conversationId → Set of connected WebSocket clients in that room
const rooms = new Map<string, Set<WebSocket>>();

// userId → WebSocket (for routing unread_update to the right user)
const userSockets = new Map<string, WebSocket>();

// WebSocket → { userId, role } (reverse lookup for cleanup)
const socketMeta = new Map<WebSocket, { userId: string; role: string }>();

// ── Helpers ───────────────────────────────────────────────────────────────────
function send(ws: WebSocket, payload: object) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function broadcast(conversationId: string, payload: object) {
    const room = rooms.get(conversationId);
    if (!room) return;
    for (const client of room) {
        send(client, payload);
    }
}

function joinRoom(conversationId: string, ws: WebSocket) {
    if (!rooms.has(conversationId)) {
        rooms.set(conversationId, new Set());
    }
    rooms.get(conversationId)!.add(ws);
}

function leaveAllRooms(ws: WebSocket) {
    for (const [, sockets] of rooms) {
        sockets.delete(ws);
    }
}

// ── MongoDB connection ────────────────────────────────────────────────────────
async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not set in environment variables');
    }
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
        console.log('[wsServer] Connected to MongoDB');
    }
}

// ── Message handlers ──────────────────────────────────────────────────────────

async function handleSendMessage(
    ws: WebSocket,
    meta: { userId: string; role: string },
    data: Extract<WsIncoming, { type: 'send_message' }>
) {
    const { conversationId, text, fileUrl, fileName, fileType } = data;

    // Validate: reject if text is empty/whitespace-only AND no fileUrl
    const trimmedText = text?.trim() ?? '';
    if (!trimmedText && !fileUrl) {
        send(ws, { type: 'error', code: 400, message: 'Message must have text or an attachment' });
        return;
    }

    // Validate: reject if text length > 2000
    if (trimmedText.length > 2000) {
        send(ws, { type: 'error', code: 400, message: 'Message text exceeds 2000 characters' });
        return;
    }

    try {
        // Persist Message to MongoDB
        const message = await MessageModel.create({
            conversationId,
            senderId: meta.userId,
            senderRole: meta.role,
            text: trimmedText || null,
            attachmentUrl: fileUrl ?? null,
            attachmentName: fileName ?? null,
            attachmentType: fileType ?? null,
            read: false,
        });

        // Determine which unread count to increment (recipient's)
        const unreadField = meta.role === 'user' ? 'adminUnreadCount' : 'userUnreadCount';

        // Update Conversation: lastMessage, lastMessageAt, increment recipient's unread count
        const lastMessagePreview = trimmedText
            ? trimmedText.slice(0, 60)
            : fileName ?? 'Attachment';

        const updatedConversation = await ConversationModel.findByIdAndUpdate(
            conversationId,
            {
                lastMessage: lastMessagePreview,
                lastMessageAt: new Date(),
                $inc: { [unreadField]: 1 },
            },
            { new: true }
        );

        if (!updatedConversation) {
            send(ws, { type: 'error', code: 500, message: 'Failed to save message' });
            return;
        }

        // Broadcast new_message to all sockets in the conversation room
        const messageObj = message.toObject();
        broadcast(conversationId, { type: 'new_message', message: messageObj });

        // Broadcast unread_update to the recipient
        const recipientUnreadCount =
            meta.role === 'user'
                ? updatedConversation.adminUnreadCount
                : updatedConversation.userUnreadCount;

        // Find the recipient socket and send unread_update
        // For user→admin: admin doesn't have a fixed userId key; broadcast to room is sufficient
        // For admin→user: send to the specific user socket
        if (meta.role === 'admin') {
            // Recipient is the user — find their socket via userId stored in conversation
            const recipientUserId = updatedConversation.userId.toString();
            const recipientSocket = userSockets.get(recipientUserId);
            if (recipientSocket) {
                send(recipientSocket, {
                    type: 'unread_update',
                    conversationId,
                    unreadCount: recipientUnreadCount,
                });
            }
        } else {
            // Recipient is admin — broadcast to room (admin may be in the room)
            // We send to all room members except the sender
            const room = rooms.get(conversationId);
            if (room) {
                for (const client of room) {
                    if (client !== ws) {
                        send(client, {
                            type: 'unread_update',
                            conversationId,
                            unreadCount: recipientUnreadCount,
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[wsServer] DB error on send_message:', err);
        // On DB failure: send error to sender only; do NOT broadcast
        send(ws, { type: 'error', code: 500, message: 'Failed to save message' });
    }
}

async function handleMarkRead(
    ws: WebSocket,
    meta: { userId: string; role: string },
    data: Extract<WsIncoming, { type: 'mark_read' }>
) {
    const { conversationId } = data;
    const callerRole = meta.role as 'user' | 'admin';

    try {
        // Set read = true for all unread messages where senderRole !== callerRole
        // (i.e., messages sent by the other party that the caller hasn't read yet)
        await MessageModel.updateMany(
            {
                conversationId,
                read: false,
                senderRole: { $ne: callerRole },
            },
            { $set: { read: true } }
        );

        // Reset the appropriate unread count on the conversation
        const unreadField = callerRole === 'admin' ? 'adminUnreadCount' : 'userUnreadCount';
        await ConversationModel.findByIdAndUpdate(conversationId, {
            [unreadField]: 0,
        });

        // Broadcast unread_update with count 0 to the caller
        send(ws, { type: 'unread_update', conversationId, unreadCount: 0 });
    } catch (err) {
        console.error('[wsServer] DB error on mark_read:', err);
        send(ws, { type: 'error', code: 500, message: 'Failed to mark messages as read' });
    }
}

// ── WebSocket Server ──────────────────────────────────────────────────────────

async function main() {
    await connectDB();

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('NEXTAUTH_SECRET is not set in environment variables');
    }

    const wss = new WebSocketServer({ port: 4000 });
    console.log('[wsServer] WebSocket server listening on port 4000');

    wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
        // Extract ?token= query param from the URL
        const url = new URL(req.url ?? '', 'ws://localhost:4000');
        const token = url.searchParams.get('token');

        if (!token) {
            ws.close(4001, 'Unauthorized');
            return;
        }

        // Validate JWT using NEXTAUTH_SECRET
        let payload: jwt.JwtPayload;
        try {
            const decoded = jwt.verify(token, secret);
            if (typeof decoded === 'string' || !decoded.sub) {
                ws.close(4001, 'Unauthorized');
                return;
            }
            payload = decoded as jwt.JwtPayload;
        } catch {
            ws.close(4001, 'Unauthorized');
            return;
        }

        const userId = payload.sub as string;
        const role = (payload.role as string) ?? 'user';

        // Register socket in user map
        userSockets.set(userId, ws);
        socketMeta.set(ws, { userId, role });

        console.log(`[wsServer] Client connected: userId=${userId}, role=${role}`);

        ws.on('message', async (raw: Buffer | string) => {
            let data: WsIncoming;
            try {
                data = JSON.parse(raw.toString()) as WsIncoming;
            } catch {
                send(ws, { type: 'error', code: 400, message: 'Invalid JSON' });
                return;
            }

            const meta = socketMeta.get(ws);
            if (!meta) return;

            if (data.type === 'send_message') {
                // Join the room for this conversation if not already in it
                joinRoom(data.conversationId, ws);
                await handleSendMessage(ws, meta, data);
            } else if (data.type === 'mark_read') {
                // Join the room for this conversation if not already in it
                joinRoom(data.conversationId, ws);
                await handleMarkRead(ws, meta, data);
            } else {
                send(ws, { type: 'error', code: 400, message: 'Unknown message type' });
            }
        });

        ws.on('close', () => {
            const meta = socketMeta.get(ws);
            if (meta) {
                userSockets.delete(meta.userId);
                socketMeta.delete(ws);
            }
            leaveAllRooms(ws);
            console.log(`[wsServer] Client disconnected: userId=${userId}`);
        });

        ws.on('error', (err) => {
            console.error(`[wsServer] Socket error for userId=${userId}:`, err);
        });
    });

    wss.on('error', (err) => {
        console.error('[wsServer] Server error:', err);
    });
}

main().catch((err) => {
    console.error('[wsServer] Fatal error:', err);
    process.exit(1);
});
