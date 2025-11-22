# UI Mockup - Conversation Management

This document provides a visual representation of the new conversation management UI.

## Layout Overview

### Desktop View (1200px+)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              THELEX AI APPLICATION                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┬────────────────────────────────────────────────────────┐
│  CONVERSATIONS      │  TheLex AI Chat                      [Sign Out]        │
│  [➕ New Chat]      │  Powered by Amazon Bedrock Agent • Logged in as user  │
│                     ├────────────────────────────────────────────────────────┤
│                     │                                                        │
│  ━━━━━━━━━━━━━━━━━  │   Welcome to TheLex AI Legal Consultant! 👋          │
│                     │                                                        │
│  [📄 Legal Question]│   Ask me about legal matters and I'll assist you     │
│  [▶] 2:30 PM   [🗑️] │   using the thelexai-laws-consultant-agent           │
│                     │                                                        │
│  [ Contract Review] │                                                        │
│  [ ] Mon       [🗑️] │                                                        │
│                     │                                                        │
│  [ Property Law]    │                                                        │
│  [ ] Jan 15    [🗑️] │                                                        │
│                     │                                                        │
│  [ Tax Question]    │                                                        │
│  [ ] Jan 14    [🗑️] │                                                        │
│                     │                                                        │
│                     ├────────────────────────────────────────────────────────┤
│                     │  [                                    ]  [Send]        │
│                     │   Type your message here...                            │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

### With Active Conversation

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│  CONVERSATIONS      │  TheLex AI Chat                      [Sign Out]        │
│  [➕ New Chat]      │  Powered by Amazon Bedrock Agent • Logged in as user  │
│                     ├────────────────────────────────────────────────────────┤
│  ━━━━━━━━━━━━━━━━━  │                                                        │
│                     │  ┌────────────────────────────────────────────────┐   │
│  [📄 Legal Question]│  │ You:                                           │   │
│  [▶] 2:30 PM   [🗑️] │  │ What are my rights as a tenant?                │   │
│  ╔═══════════════╗  │  └────────────────────────────────────────────────┘   │
│  ║ (Active)      ║  │                                                        │
│  ╚═══════════════╝  │  ┌────────────────────────────────────────────────┐   │
│                     │  │ AI:                                            │   │
│  [ Contract Review] │  │ As a tenant, you have several important        │   │
│  [ ] Mon       [🗑️] │  │ rights including...                            │   │
│                     │  │                                                │   │
│  [ Property Law]    │  │ 📚 Referenced Documents (2)                    │   │
│  [ ] Jan 15    [🗑️] │  │ ┌──────────────────────────────────────────┐ │   │
│                     │  │ │ 📄 tenant-rights.pdf             [⬇️ Download]│   │
│  [ Tax Question]    │  │ │ "Tenants have the right to..."            │ │   │
│  [ ] Jan 14    [🗑️] │  │ └──────────────────────────────────────────┘ │   │
│                     │  └────────────────────────────────────────────────┘   │
│                     ├────────────────────────────────────────────────────────┤
│                     │  [What about eviction?              ]  [Send]          │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

### Delete Confirmation State

```
┌─────────────────────┐
│  CONVERSATIONS      │
│  [➕ New Chat]      │
│                     │
│  ━━━━━━━━━━━━━━━━━  │
│                     │
│  [📄 Legal Question]│
│  [▶] 2:30 PM   [🗑️] │
│                     │
│  [ Contract Review] │
│  [ ] Mon       [✓]  │  ← Click again to confirm delete
│  ╔═══════════════╗  │
│  ║ (Red/Confirm) ║  │
│  ╚═══════════════╝  │
└─────────────────────┘
```

## Component Breakdown

### Sidebar - ConversationList Component

```
┌─────────────────────────────┐
│ CONVERSATIONS               │  ← Header with gradient background
│                             │
│ ┌─────────────────────────┐ │
│ │  ➕ New Chat            │ │  ← Button to create new conversation
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📄 Conversation Title   │ │  ← Individual conversation item
│ │ ├─ Time: 2:30 PM        │ │
│ │ └─ Delete: [🗑️]         │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📄 Another Conv...      │ │
│ │ ├─ Time: Mon            │ │
│ │ └─ Delete: [🗑️]         │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Active Conversation State:**
- Purple gradient background (#667eea to #764ba2)
- White text
- Visually distinct from other conversations

### Main Chat Area - ChatInterface Component

```
┌────────────────────────────────────────────────────┐
│  TheLex AI Chat                    [Sign Out]      │  ← Header
│  Powered by Bedrock • Logged in as user            │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ You:                                         │ │  ← User message
│  │ Message content...                           │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ AI:                                          │ │  ← AI message
│  │ Response content...                          │ │
│  │                                              │ │
│  │ 📚 Referenced Documents (1)                  │ │  ← Citations
│  │ ┌────────────────────────────────────────┐  │ │
│  │ │ 📄 document.pdf         [⬇️ Download] │  │ │
│  │ │ Preview text...                        │  │ │
│  │ └────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
├────────────────────────────────────────────────────┤
│  [ Type your message here...      ]  [ Send ]      │  ← Input form
└────────────────────────────────────────────────────┘
```

## Color Scheme

### Primary Colors
- **Gradient**: Linear gradient from `#667eea` (light purple) to `#764ba2` (deep purple)
- **Background**: `#f8f9fa` (light gray)
- **Surface**: `#ffffff` (white)

### Text Colors
- **Primary**: `#333333` (dark gray)
- **Secondary**: `#6c757d` (medium gray)
- **Muted**: `#495057` (gray)

### Borders
- **Default**: `#e9ecef` (light border)
- **Hover**: `#dee2e6` (slightly darker)

### State Colors
- **Active**: Purple gradient with white text
- **Hover**: `#f1f3f5` background
- **Delete Confirm**: `#dc3545` (red)

## Responsive Behavior

### Mobile View (< 768px)

Conversations and chat can stack vertically or sidebar becomes toggleable:

```
┌──────────────────────┐
│  [☰] TheLex AI Chat  │  ← Toggle for sidebar
│  [Sign Out]          │
├──────────────────────┤
│                      │
│  Messages Area       │
│                      │
│                      │
├──────────────────────┤
│  [ Input ] [Send]    │
└──────────────────────┘
```

## Interactions

### Creating a Conversation
1. User clicks "➕ New Chat"
2. New conversation created with title "New Conversation"
3. Conversation added to top of list
4. Automatically selected as active
5. User types first message
6. Title automatically updated to first message (truncated to 50 chars)

### Switching Conversations
1. User clicks conversation in sidebar
2. Active state moves to clicked conversation
3. Messages load from database
4. Chat area updates with historical messages
5. Input ready for new message

### Deleting a Conversation
1. User clicks 🗑️ icon
2. Icon changes to ✓ with red background
3. User has 3 seconds to confirm
4. Click ✓ to delete OR wait for timeout to cancel
5. If deleted: conversation and all messages removed
6. If deleting active conversation: chat clears to empty state

## Empty States

### No Conversations
```
┌─────────────────────┐
│  CONVERSATIONS      │
│  [➕ New Chat]      │
│                     │
│  No conversations   │
│  yet.               │
│                     │
│  Click "New Chat"   │
│  to start!          │
└─────────────────────┘
```

### No Messages in Conversation
```
┌────────────────────────────────┐
│                                │
│  Welcome to TheLex AI! 👋     │
│                                │
│  Ask me about legal matters    │
│  and I'll assist you           │
│                                │
└────────────────────────────────┘
```

## Animation & Transitions

- **Fade in**: New messages (0.3s ease-in)
- **Hover transform**: Conversation items slide right (translateX(2px))
- **Button hover**: Lift effect (translateY(-1px, -2px))
- **Loading**: "Thinking..." with italic text

## Accessibility

- **Keyboard Navigation**: Tab through conversations and buttons
- **ARIA Labels**: Proper labels for buttons and interactive elements
- **Focus Indicators**: Visible focus rings on keyboard navigation
- **Color Contrast**: WCAG AA compliant text colors

## Technical Details

### CSS Classes
- `.app-layout` - Flex container for sidebar + chat
- `.conversation-list` - Sidebar component
- `.conversation-item` - Individual conversation
- `.conversation-item.active` - Active conversation state
- `.chat-container` - Main chat area
- `.chat-messages` - Scrollable message area
- `.message` - Individual message
- `.user-message` - User's message (right-aligned, purple)
- `.assistant-message` - AI's message (left-aligned, white)
- `.citations` - Citation container
- `.citation-item` - Individual citation with download button

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Future UI Enhancements

1. **Sidebar Toggle**: Hamburger menu on mobile
2. **Search Bar**: Filter conversations by title/content
3. **Conversation Icons**: Different icons for conversation types
4. **Edit Title**: Inline editing of conversation titles
5. **Settings Panel**: User preferences and configuration
6. **Dark Mode**: Alternative color scheme
7. **Message Timestamps**: Show time for each message
8. **Typing Indicator**: Animated dots while AI responds
9. **Message Actions**: Copy, regenerate, feedback buttons
10. **Conversation Preview**: Show last message in sidebar
