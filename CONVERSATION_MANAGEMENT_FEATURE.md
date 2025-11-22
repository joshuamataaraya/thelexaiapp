# Conversation Management Feature

This document describes the new conversation management feature that has been added to TheLex AI App.

## Overview

The app now includes full conversation management capabilities, allowing users to:
- **Create new conversations** with a single click
- **View all past conversations** in a sidebar
- **Switch between conversations** to view message history
- **Delete old conversations** when they're no longer needed
- **Automatic message persistence** - all messages are saved to the database

## Architecture Changes

### Backend (AWS Amplify Data)

The data schema has been updated to include two new models:

#### Conversation Model
```typescript
Conversation: {
  id: ID
  title: String (required)
  userId: String (required)
  sessionId: String (required) // Bedrock Agent session ID
  lastMessageAt: DateTime
  createdAt: DateTime
  messages: [Message] // HasMany relationship
}
```

#### Message Model
```typescript
Message: {
  id: ID
  conversationId: ID (required)
  conversation: Conversation // BelongsTo relationship
  role: String (required) // 'user' or 'assistant'
  content: String (required)
  citations: JSON // Stores citation data from Bedrock Agent
  createdAt: DateTime
}
```

**Authorization**: Both models use `owner` authorization, meaning users can only access their own conversations and messages.

### Frontend Components

#### New Components

1. **ConversationList Component** (`src/components/ConversationList.jsx`)
   - Displays all conversations in a sidebar
   - Shows conversation title and last message time
   - Highlights the currently active conversation
   - Provides "New Chat" button
   - Allows deletion of conversations with confirmation

2. **Updated ChatInterface Component** (`src/components/ChatInterface.jsx`)
   - Integrated with AWS Amplify Data client
   - Loads conversations on mount
   - Loads messages when switching conversations
   - Automatically saves messages to database
   - Auto-generates conversation titles from first message
   - Creates new conversation automatically when sending first message

## User Experience

### UI Layout

The app now features a two-column layout:

```
┌──────────────────────┬─────────────────────────────────────┐
│  Conversation List   │         Chat Interface             │
│  (Sidebar - 300px)   │         (Main Area)                │
│                      │                                     │
│  ┌──────────────┐    │  ┌───────────────────────────────┐ │
│  │ New Chat [+] │    │  │ Header with Sign Out          │ │
│  └──────────────┘    │  └───────────────────────────────┘ │
│                      │                                     │
│  • Conv. 1 (active)  │  ┌───────────────────────────────┐ │
│  • Conv. 2           │  │                               │ │
│  • Conv. 3           │  │   Messages Area               │ │
│  • ...               │  │                               │ │
│                      │  └───────────────────────────────┘ │
│                      │                                     │
│                      │  ┌───────────────────────────────┐ │
│                      │  │ Input Form                    │ │
│                      │  └───────────────────────────────┘ │
└──────────────────────┴─────────────────────────────────────┘
```

### Features in Action

#### 1. Creating a New Conversation
- User clicks "➕ New Chat" button in sidebar
- A new conversation is created with title "New Conversation"
- User can start typing immediately
- Title is automatically updated based on first message

#### 2. Viewing Conversations
- All conversations are listed in the sidebar
- Sorted by most recent activity (lastMessageAt)
- Each item shows:
  - Conversation title (truncated to 50 chars if needed)
  - Relative time (e.g., "2:30 PM", "Mon", "Jan 15")
- Active conversation is highlighted with gradient background

#### 3. Switching Conversations
- Click any conversation in the sidebar
- Messages from that conversation load automatically
- Chat interface updates to show historical messages
- Maintains the Bedrock Agent session ID for continuity

#### 4. Deleting Conversations
- Click the 🗑️ icon next to a conversation
- Icon changes to ✓ for confirmation
- Click again within 3 seconds to confirm deletion
- All messages in the conversation are also deleted
- If deleting the current conversation, switches to empty state

#### 5. Automatic Message Persistence
- Every user message is saved to the database
- Every AI response is saved with citations (if any)
- Messages are timestamped for accurate ordering
- Conversation's `lastMessageAt` is updated on each message

## Technical Implementation Details

### Data Flow

1. **On App Load**:
   ```
   User Login → Load Conversations → Display in Sidebar
   ```

2. **On Conversation Select**:
   ```
   Select Conversation → Load Messages → Display in Chat
   ```

3. **On Send Message**:
   ```
   User Input → Check if Conversation Exists
              → Create New if Needed
              → Save User Message to DB
              → Call Bedrock Agent
              → Save AI Response to DB
              → Update lastMessageAt
              → Update UI
   ```

4. **On Delete Conversation**:
   ```
   Delete Request → Confirm → Delete All Messages
                           → Delete Conversation
                           → Update Sidebar
                           → Clear Chat if Current
   ```

### State Management

The ChatInterface component manages several state variables:
- `conversations`: Array of conversation objects
- `currentConversation`: Currently selected conversation
- `messages`: Array of messages for current conversation
- `input`: User's current input text
- `isLoading`: Loading state for API calls
- `downloadingFiles`: Set of file URIs being downloaded

### Database Queries

Using AWS Amplify Data client (`generateClient()`):

```javascript
// List conversations for current user
client.models.Conversation.list({
  filter: { userId: { eq: user.username } }
})

// List messages for a conversation
client.models.Message.list({
  filter: { conversationId: { eq: conversationId } }
})

// Create conversation
client.models.Conversation.create({
  title, userId, sessionId, createdAt, lastMessageAt
})

// Create message
client.models.Message.create({
  conversationId, role, content, citations, createdAt
})

// Delete conversation and messages
client.models.Message.delete({ id })
client.models.Conversation.delete({ id })
```

## Responsive Design

The UI is fully responsive:
- **Desktop**: Sidebar + Chat in side-by-side layout
- **Mobile**: Sidebar can be toggled (future enhancement) or stacks vertically

## Styling

### Color Scheme
- **Primary Gradient**: `#667eea` to `#764ba2` (purple gradient)
- **Background**: `#f8f9fa` (light gray)
- **Borders**: `#e9ecef` (subtle gray)
- **Active State**: Purple gradient background with white text

### Key CSS Classes
- `.app-layout`: Flex container for sidebar + chat
- `.conversation-list`: Sidebar component
- `.conversation-item`: Individual conversation entry
- `.conversation-item.active`: Active conversation highlight
- `.chat-container`: Main chat area

## Future Enhancements

Potential improvements for future iterations:
1. **Search conversations** by title or content
2. **Edit conversation titles** manually
3. **Share conversations** with other users
4. **Export conversations** as PDF or text
5. **Archive conversations** instead of deleting
6. **Conversation folders/tags** for organization
7. **Mobile sidebar toggle** for better mobile UX
8. **Infinite scroll** for large conversation lists
9. **Real-time updates** using subscriptions
10. **Conversation preview** showing last message

## Testing

To test the conversation management features:

1. **Setup**: Deploy the updated Amplify backend with the new data schema
2. **Create**: Click "New Chat" and send a message
3. **Verify**: Check that the conversation appears in sidebar with proper title
4. **Switch**: Create another conversation and switch between them
5. **Persistence**: Refresh the page and verify conversations load
6. **Delete**: Test deleting conversations with confirmation flow
7. **Edge Cases**: Test with no conversations, long titles, many conversations

## Authentication Screenshot

![Authentication Screen](https://github.com/user-attachments/assets/2fadbefe-b7ee-458a-bca3-5be2f3ffa5c5)

The app uses AWS Amplify Authentication. Users must sign in before accessing conversation management features.

## Deployment Notes

When deploying this feature:

1. **Backend First**: Deploy the updated Amplify backend to create the database tables
   ```bash
   npx ampx sandbox  # For development
   # or
   # Deploy via AWS Amplify Console for production
   ```

2. **Verify Schema**: Ensure Conversation and Message models are created in DynamoDB

3. **Frontend Deploy**: Deploy the updated frontend code

4. **Test Authorization**: Verify that users can only see their own conversations

## Migration

For existing users with active sessions:
- Previous conversations were not stored, so users start fresh
- This is expected behavior as the app didn't have persistence before
- Users can create new conversations immediately after the update

## Summary

This feature transforms TheLex AI App from a single-session chat interface into a full-featured conversation management system. Users can now maintain multiple conversations, review past interactions, and organize their AI consultations effectively. The implementation follows AWS Amplify best practices with proper authorization, data modeling, and user experience considerations.
