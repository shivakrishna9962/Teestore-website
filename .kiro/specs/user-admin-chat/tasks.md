# Implementation Plan: User-Admin Chat

## Overview

Implement a real-time one-to-one chat system between store users and the admin. The feature adds a floating `ChatWidget` to the store navbar, a dedicated `AdminChatPanel` at `/admin/chat`, a standalone WebSocket server, REST API routes, Mongoose models, and a Redux `chatSlice`. Implementation proceeds bottom-up: types → models → Redux → WebSocket server → REST routes → UI components → integration.

## Tasks

- [x] 1. Set up types, data models, and Redux slice
  - [x] 1.1 Create TypeScript types at `src/types/chat.ts`
    - Define `Conversation`, `Message`, `WsIncoming`, `WsOutgoing` interfaces as specified in the design
    - _Requirements: 2.1, 3.1, 7.3_

  - [x] 1.2 Create Mongoose model `src/models/Conversation.ts`
    - Fields: `userId`, `adminUnreadCount`, `userUnreadCount`, `lastMessage`, `lastMessageAt`, `createdAt`
    - Add indexes: `{ userId: 1 }` unique, `{ lastMessageAt: -1 }`
    - _Requirements: 2.1, 7.1, 8.1_

  - [x] 1.3 Create Mongoose model `src/models/Message.ts`
    - Fields: `conversationId`, `senderId`, `senderRole`, `text`, `attachmentUrl`, `attachmentName`, `attachmentType`, `read`, `createdAt`
    - Add index: `{ conversationId: 1, createdAt: 1 }`
    - _Requirements: 7.1, 7.3_

  - [x] 1.4 Create Redux slice at `src/features/chat/chatSlice.ts`
    - Define `ChatState` with `conversations`, `activeConversationId`, `messages`, `userUnreadCount`, `adminTotalUnread`, `loading`, `error`
    - Implement async thunks: `loadConversation`, `loadMessages`, `loadAdminConversations`, `markConversationRead`, `uploadAttachment`, `fetchUserUnreadCount`
    - Implement synchronous actions: `receiveMessage`, `updateUnreadCount`
    - _Requirements: 2.2, 5.2, 8.1, 8.3_

  - [x] 1.5 Register `chatReducer` in `src/lib/store.ts`
    - Import and add `chat: chatReducer` to the `configureStore` reducer map
    - _Requirements: 2.2, 5.2_

- [x] 2. Implement REST API routes
  - [x] 2.1 Create `GET /api/chat/conversation` route
    - Get or create the authenticated user's conversation (upsert by `userId`)
    - Return the conversation document
    - _Requirements: 2.1, 2.2_

  - [ ]* 2.2 Write property test for one-conversation-per-user idempotence
    - **Property 2: One conversation per user (idempotence)**
    - **Validates: Requirements 2.1**

  - [x] 2.3 Create `GET /api/chat/conversation/[id]/messages` route
    - Fetch full message history sorted by `createdAt` ascending
    - Authorize: user may only access their own conversation; admin may access any
    - Populate `senderName` from the User collection
    - _Requirements: 2.2, 2.7, 5.4, 7.2_

  - [ ]* 2.4 Write property tests for message history and access control
    - **Property 3: Message history round-trip in chronological order**
    - **Validates: Requirements 2.2, 5.4, 7.2**
    - **Property 14: Cross-user conversation access denied**
    - **Validates: Requirements 2.7**

  - [x] 2.5 Create `PUT /api/chat/conversation/[id]/read` route
    - Set `read = true` on all unread messages where the caller is the recipient
    - Reset `adminUnreadCount` or `userUnreadCount` to 0 on the conversation
    - _Requirements: 2.5, 5.6, 8.2_

  - [ ]* 2.6 Write property test for mark-as-read
    - **Property 17: Mark-as-read on open**
    - **Validates: Requirements 2.5, 5.6**
    - **Property 15: Unread count round-trip (increment then reset)**
    - **Validates: Requirements 8.1, 8.2**

  - [x] 2.7 Create `GET /api/chat/admin/conversations` route
    - Admin-only; list all conversations sorted by `lastMessageAt` descending
    - Populate `user` field (`_id`, `name`, `email`) from the User collection
    - _Requirements: 5.1, 5.2_

  - [x] 2.8 Create `GET /api/chat/unread` route
    - Return `userUnreadCount` for the authenticated user's conversation
    - _Requirements: 1.2, 8.1_

  - [x] 2.9 Create `POST /api/chat/upload` route
    - Accept `multipart/form-data` with a single file field
    - Server-side validate MIME type (jpeg, png, gif, webp, pdf, doc, docx) and size (≤ 10 MB)
    - Save file to `public/uploads/chat/<uuid>.<ext>`
    - Return `{ url, name, type }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.10 Write property tests for file upload validation
    - **Property 8: File type validation**
    - **Validates: Requirements 4.1, 4.2**
    - **Property 9: File size validation**
    - **Validates: Requirements 4.3, 4.4**

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the standalone WebSocket server
  - [x] 4.1 Create `src/server/wsServer.ts`
    - Initialize a `ws.Server` on port 4000
    - On connection: extract `?token=` query param, validate JWT using `NEXTAUTH_SECRET`, close with code `4001` if invalid
    - Maintain an in-memory room map: `conversationId → Set<WebSocket>`
    - _Requirements: 6.1, 6.4_

  - [x] 4.2 Implement `send_message` handler in the WebSocket server
    - Validate text length (≤ 2000) and reject empty/whitespace-only text
    - Persist `Message` to MongoDB via Mongoose
    - Update `Conversation.lastMessage`, `lastMessageAt`, increment recipient's unread count
    - Broadcast `new_message` to all sockets in the conversation room
    - Broadcast `unread_update` to the recipient
    - On DB failure: send `{ type: 'error', code: 500 }` to sender only; do NOT broadcast
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 7.1, 7.4, 8.1, 8.3_

  - [ ]* 4.3 Write property tests for message validation logic
    - **Property 5: Whitespace message rejection**
    - **Validates: Requirements 3.2**
    - **Property 6: Character limit boundary**
    - **Validates: Requirements 3.3, 3.4**

  - [x] 4.4 Implement `mark_read` handler in the WebSocket server
    - Set `read = true` for all unread messages in the conversation where recipient is caller
    - Reset the appropriate unread count field on the conversation to 0
    - Broadcast `unread_update` with count 0 to the caller
    - _Requirements: 2.5, 5.6, 8.2, 8.3_

  - [ ]* 4.5 Write property test for message persistence fields
    - **Property 4: Message persistence with all required fields**
    - **Validates: Requirements 3.1, 7.1, 7.3**

- [x] 5. Implement shared chat UI components
  - [x] 5.1 Create `src/components/chat/MessageList.tsx`
    - Accept `messages: Message[]` and `currentUserId: string` props
    - Render each message with sender name, content (text or attachment), and timestamp formatted as HH:MM
    - For `attachmentType = 'image'`: render `<img>` thumbnail with `src = attachmentUrl`
    - For `attachmentType = 'document'`: render `<a href={attachmentUrl}>` with `attachmentName` as link text
    - Auto-scroll to bottom on new messages
    - _Requirements: 2.6, 4.5, 4.6_

  - [ ]* 5.2 Write property tests for message rendering
    - **Property 10: Image attachment renders as thumbnail**
    - **Validates: Requirements 4.5**
    - **Property 11: Document attachment renders as downloadable link**
    - **Validates: Requirements 4.6**

  - [x] 5.3 Create `src/components/chat/MessageInput.tsx`
    - Accept `onSend: (text: string, file?: File) => void` and `disabled: boolean` props
    - Client-side validate: reject empty/whitespace, reject text > 2000 chars, reject invalid MIME type, reject file > 10 MB
    - Show inline validation errors for each failure case
    - Clear input field after successful send
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.4 Write property tests for input validation
    - **Property 5: Whitespace message rejection** (client-side)
    - **Validates: Requirements 3.2**
    - **Property 6: Character limit boundary** (client-side)
    - **Validates: Requirements 3.3, 3.4**
    - **Property 7: Input field cleared after successful send**
    - **Validates: Requirements 3.5**

  - [x] 5.5 Create `src/components/chat/ConversationList.tsx`
    - Accept `conversations: Conversation[]`, `activeConversationId: string | null`, `onSelect: (id: string) => void` props
    - Render each item with user name, last message preview (≤ 60 chars), timestamp, and unread badge when `adminUnreadCount > 0`
    - _Requirements: 5.2, 5.3_

  - [ ]* 5.6 Write property test for conversation list item rendering
    - **Property 12: Conversation list item renders required fields with truncated preview**
    - **Validates: Requirements 5.2, 5.3**

- [x] 6. Implement the WebSocket client hook
  - [x] 6.1 Create `src/hooks/useChat.ts`
    - Connect to `ws://localhost:4000?token=<jwt>` on mount
    - Implement exponential backoff reconnection: `delay = min(1000 * 2^attempt, 30_000)` ms
    - On reconnect: fetch missed messages via `loadMessages` thunk
    - On `new_message`: dispatch `receiveMessage`
    - On `unread_update`: dispatch `updateUnreadCount`
    - Close connection gracefully on unmount or when widget closes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.2 Write property test for reconnection backoff
    - **Property 13: Exponential backoff stays within bounds**
    - **Validates: Requirements 6.2**

- [ ] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the store-side ChatWidget and navbar integration
  - [x] 8.1 Create `src/components/chat/ChatWidget.tsx`
    - Floating overlay panel; hidden when session is null
    - On open: dispatch `loadConversation()`, call `useChat` hook to connect WebSocket
    - On close: disconnect WebSocket gracefully
    - Render `MessageList` and `MessageInput`
    - Handle attachment upload flow: POST to `/api/chat/upload`, then send `send_message` over WebSocket; on upload error show toast and retain input
    - _Requirements: 1.4, 2.2, 2.3, 2.4, 4.7, 6.5_

  - [x] 8.2 Add `ChatIcon` and `ChatWidget` to `src/components/Navbar.tsx`
    - Render chat icon button immediately after the notification bell
    - Show numeric unread badge from `userUnreadCount` in Redux; cap display at "9+"
    - Hide icon when user is not authenticated
    - Toggle `ChatWidget` open/closed on click
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 8.3 Write property test for badge display capping
    - **Property 1: Badge display capping**
    - **Validates: Requirements 1.2, 8.4**

- [x] 9. Implement the Admin Chat Panel and sidebar integration
  - [x] 9.1 Create `src/app/admin/chat/page.tsx` (`AdminChatPanel`)
    - Two-column layout: `ConversationList` on the left, `MessageList` + `MessageInput` on the right
    - On mount: dispatch `loadAdminConversations()`, connect WebSocket via `useChat`
    - On conversation select: dispatch `loadMessages(id)` and `markConversationRead(id)`
    - Show placeholder in right column when no conversation is selected
    - Handle attachment upload and send flow (same as ChatWidget)
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7_

  - [x] 9.2 Add Chat nav item to `src/app/admin/layout.tsx`
    - Append `{ href: '/admin/chat', label: 'Chat', icon: '💬' }` as the sixth entry in `NAV_LINKS`
    - Create a thin Client Component `AdminChatNavItem` that reads `adminTotalUnread` from Redux and renders the Chat link with a live unread badge capped at "9+"
    - _Requirements: 5.1, 8.4_

  - [ ]* 9.3 Write property test for admin total unread aggregation
    - **Property 16: Admin total unread count aggregation**
    - **Validates: Requirements 8.4**

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Each property test must include the comment tag: `// Feature: user-admin-chat, Property N: <property text>`
- The WebSocket server (`src/server/wsServer.ts`) runs as a separate process on port 4000; start it manually with `npx ts-node src/server/wsServer.ts` alongside `npm run dev`
