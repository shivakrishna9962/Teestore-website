# Requirements Document

## Introduction

This document defines the requirements for a real-time chat feature in TeeStore, a Next.js e-commerce platform for T-shirts. The feature enables authenticated store users to initiate and maintain a private conversation with the store admin. The admin can view and respond to all user conversations from the admin panel. Communication is real-time via WebSocket and supports text messages, images, and documents. The chat icon is placed in the store navbar next to the notification bell.

## Glossary

- **Chat_System**: The overall real-time messaging feature described in this document
- **User**: An authenticated store customer with role `user`
- **Admin**: An authenticated user with role `admin`
- **Conversation**: A persistent, one-to-one thread between a single User and the Admin
- **Message**: A single unit of communication within a Conversation, containing text, an image, or a document
- **WebSocket_Server**: The server-side component that manages persistent WebSocket connections and routes messages in real time
- **Chat_Widget**: The floating chat UI component rendered in the store layout for Users
- **Admin_Chat_Panel**: The chat interface rendered in the admin panel that lists all Conversations and allows the Admin to respond
- **Unread_Count**: The number of messages in a Conversation that have been received but not yet read by the recipient
- **Attachment**: A file (image or document) sent as a Message
- **NextAuth_Session**: The authentication session managed by NextAuth, used to identify the current User or Admin

## Requirements

### Requirement 1: Chat Icon in Store Navbar

**User Story:** As a User, I want a chat icon in the navbar next to the notification bell, so that I can quickly open a conversation with the admin from any page.

#### Acceptance Criteria

1. THE Chat_System SHALL render a chat icon button in the store navbar immediately adjacent to the notification bell icon.
2. WHEN the User has unread messages from the Admin, THE Chat_System SHALL display a numeric badge on the chat icon showing the Unread_Count, capped at display value "9+" for counts exceeding 9.
3. WHEN the User is not authenticated, THE Chat_System SHALL hide the chat icon from the navbar.
4. WHEN the User clicks the chat icon, THE Chat_Widget SHALL open as an overlay panel without navigating away from the current page.

---

### Requirement 2: User Conversation with Admin

**User Story:** As a User, I want to send and receive messages with the admin in real time, so that I can get support or ask questions about my orders and products.

#### Acceptance Criteria

1. THE Chat_System SHALL create exactly one Conversation per User, scoped to that User and the Admin.
2. WHEN the User opens the Chat_Widget, THE Chat_Widget SHALL load and display the full message history of the User's Conversation.
3. WHEN the User sends a text message, THE WebSocket_Server SHALL deliver the message to the Admin in real time without requiring a page refresh.
4. WHEN the Admin sends a reply, THE WebSocket_Server SHALL deliver the reply to the User in real time without requiring a page refresh.
5. WHILE the Chat_Widget is open, THE Chat_System SHALL mark all incoming messages as read automatically.
6. THE Chat_System SHALL display each Message with the sender's name, message content, and a timestamp formatted as HH:MM.
7. WHEN a User attempts to access another User's Conversation, THE Chat_System SHALL deny access and return an authorization error.

---

### Requirement 3: Sending Text Messages

**User Story:** As a User or Admin, I want to send text messages in a Conversation, so that I can communicate clearly and quickly.

#### Acceptance Criteria

1. WHEN the sender submits a non-empty text message, THE Chat_System SHALL persist the Message to the database and broadcast it to the recipient via WebSocket.
2. WHEN the sender submits an empty or whitespace-only message, THE Chat_System SHALL reject the submission and display a validation error.
3. THE Chat_System SHALL support text messages up to 2000 characters in length.
4. IF a text message exceeds 2000 characters, THEN THE Chat_System SHALL reject the submission and display an error indicating the character limit.
5. WHEN a message is successfully sent, THE Chat_Widget SHALL clear the message input field.

---

### Requirement 4: Sending Images and Documents

**User Story:** As a User or Admin, I want to attach images and documents to messages, so that I can share order screenshots, receipts, or product references.

#### Acceptance Criteria

1. WHEN the sender attaches a file, THE Chat_System SHALL accept files of type JPEG, PNG, GIF, WebP (images) and PDF, DOC, DOCX (documents).
2. IF the attached file type is not in the accepted list, THEN THE Chat_System SHALL reject the upload and display an error listing the accepted file types.
3. THE Chat_System SHALL accept Attachment files up to 10 MB in size.
4. IF the attached file exceeds 10 MB, THEN THE Chat_System SHALL reject the upload and display an error stating the size limit.
5. WHEN an image Attachment is sent, THE Chat_Widget SHALL render a thumbnail preview of the image inline within the Conversation.
6. WHEN a document Attachment is sent, THE Chat_Widget SHALL render the document as a downloadable link displaying the original filename.
7. WHEN an Attachment upload fails due to a server error, THE Chat_System SHALL display an error message and retain the unsent message content in the input field.

---

### Requirement 5: Admin Chat Panel

**User Story:** As an Admin, I want to view and respond to all user conversations from the admin panel, so that I can provide timely support to all customers.

#### Acceptance Criteria

1. THE Admin_Chat_Panel SHALL be accessible from the admin sidebar navigation.
2. THE Admin_Chat_Panel SHALL display a list of all Conversations, each showing the User's name, the last message preview truncated to 60 characters, and the timestamp of the last message.
3. WHEN a Conversation has unread messages, THE Admin_Chat_Panel SHALL highlight that Conversation and display the Unread_Count badge.
4. WHEN the Admin selects a Conversation, THE Admin_Chat_Panel SHALL load and display the full message history for that Conversation.
5. WHEN a User sends a new message, THE WebSocket_Server SHALL push the message to the Admin_Chat_Panel in real time without requiring a page refresh.
6. WHEN the Admin opens a Conversation, THE Chat_System SHALL mark all unread messages in that Conversation as read.
7. THE Admin_Chat_Panel SHALL support sending text messages and Attachments using the same constraints defined in Requirements 3 and 4.

---

### Requirement 6: Real-Time WebSocket Connection Management

**User Story:** As a User or Admin, I want the chat to reconnect automatically if the connection drops, so that I don't lose messages due to temporary network issues.

#### Acceptance Criteria

1. WHEN an authenticated User or Admin loads a page containing the chat interface, THE WebSocket_Server SHALL establish a WebSocket connection authenticated via the NextAuth_Session.
2. IF the WebSocket connection is lost, THEN THE Chat_System SHALL attempt to reconnect with exponential backoff, with a maximum retry interval of 30 seconds.
3. WHEN the WebSocket connection is re-established after a drop, THE Chat_System SHALL fetch and display any messages received during the disconnection period.
4. IF an unauthenticated client attempts to establish a WebSocket connection, THEN THE WebSocket_Server SHALL reject the connection and close it with a 4001 status code.
5. WHEN the User navigates away from the page or closes the Chat_Widget, THE Chat_System SHALL close the WebSocket connection gracefully.

---

### Requirement 7: Message Persistence

**User Story:** As a User or Admin, I want chat history to be saved, so that I can review past conversations at any time.

#### Acceptance Criteria

1. THE Chat_System SHALL persist every Message to the database before broadcasting it via WebSocket.
2. WHEN the Chat_Widget or Admin_Chat_Panel is opened, THE Chat_System SHALL retrieve and display the full message history for the Conversation in chronological order.
3. THE Chat_System SHALL store for each Message: sender ID, sender role, message content or Attachment reference, timestamp, and read status.
4. IF the database write for a Message fails, THEN THE Chat_System SHALL return an error to the sender and SHALL NOT broadcast the Message via WebSocket.

---

### Requirement 8: Unread Message Counts

**User Story:** As a User or Admin, I want to see how many unread messages I have, so that I know when I need to respond.

#### Acceptance Criteria

1. THE Chat_System SHALL maintain an Unread_Count per Conversation per recipient, incremented when a new Message is delivered and the recipient does not have the Conversation open.
2. WHEN the recipient opens a Conversation, THE Chat_System SHALL reset the Unread_Count for that recipient to zero.
3. WHEN the Unread_Count changes, THE Chat_System SHALL update the badge on the chat icon (for Users) or the Conversation list item (for Admin) in real time via WebSocket.
4. THE Chat_System SHALL display the total Unread_Count across all Conversations as the badge value on the Admin's chat navigation item.
