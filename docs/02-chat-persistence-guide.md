# Chat Persistence with RxDB

This document describes the chat persistence implementation using RxDB for the GoatedApp Electron application.

## Overview

The chat persistence feature enables:
- Saving conversations and messages to IndexedDB
- Automatic persistence across app restarts
- Reactive UI updates when data changes
- Conversation history management (create, delete, search)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                         │
│                        (App.tsx)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   useConversations Hook                      │
│              (src/renderer/hooks/useConversations.ts)        │
│  - Manages React state                                       │
│  - Subscribes to RxDB observables                           │
│  - Provides CRUD actions                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      RxDBService                             │
│                (src/renderer/db/RxDBService.ts)              │
│  - CRUD operations for conversations/messages                │
│  - Reactive queries (RxJS Observables)                       │
│  - Search functionality                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    RxDB Database                             │
│                (src/renderer/db/database.ts)                 │
│  - Singleton database instance                               │
│  - Dexie storage (IndexedDB)                                │
│  - Schema definitions                                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      IndexedDB                               │
│                   (Browser Storage)                          │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/renderer/db/
├── database.ts      # Database initialization and singleton management
├── schemas.ts       # RxDB schema definitions for collections
├── RxDBService.ts   # Service class with CRUD operations
└── errors.ts        # Custom error types (optional)

src/renderer/hooks/
└── useConversations.ts  # React hook for conversation management
```

## Data Models

### Conversation

```typescript
interface ConversationDocument {
  id: string;          // UUID primary key
  title: string;       // Display title (max 200 chars)
  createdAt: number;   // Unix timestamp
  updatedAt: number;   // Unix timestamp (for sorting)
  preview: string;     // Last message preview (max 500 chars)
}
```

### Message

```typescript
interface MessageDocument {
  id: string;              // UUID primary key
  conversationId: string;  // Foreign key to conversation
  role: 'user' | 'assistant' | 'tool';
  content: string;         // Message content
  timestamp: number;       // Unix timestamp
  toolCalls?: ToolCallData[];  // Optional tool call data
}

interface ToolCallData {
  id: string;
  name: string;
  arguments: string;
  status: 'pending' | 'success' | 'error';
  result?: string;
}
```

## Usage

### Basic Usage in Components

```typescript
import { useConversations } from './hooks/useConversations';

function ChatComponent() {
  const {
    conversations,           // All conversations (sorted by updatedAt)
    activeConversationId,    // Currently selected conversation
    messages,                // Messages for active conversation
    isLoading,               // Database loading state
    error,                   // Error message if any
    setActiveConversationId, // Select a conversation
    createConversation,      // Create new conversation
    deleteConversation,      // Delete conversation and its messages
    addMessage,              // Add message to active conversation
    searchConversations,     // Search by message content
  } = useConversations();

  // Create a new conversation
  const handleNew = async () => {
    const conv = await createConversation();
    console.log('Created:', conv.id);
  };

  // Add a message
  const handleSend = async (text: string) => {
    await addMessage('user', text);
    // ... get AI response
    await addMessage('assistant', response, toolCalls);
  };

  // Delete a conversation
  const handleDelete = async (id: string) => {
    await deleteConversation(id);
  };

  // Search conversations
  const handleSearch = async (query: string) => {
    const results = await searchConversations(query);
    console.log('Found:', results.length);
  };
}
```

### Direct Service Usage

```typescript
import { rxdbService } from './db/RxDBService';

// Initialize (required before any operations)
await rxdbService.initialize();

// Create conversation
const conv = await rxdbService.createConversation('My Chat');

// Add messages
await rxdbService.addMessage(conv.id, 'user', 'Hello!');
await rxdbService.addMessage(conv.id, 'assistant', 'Hi there!');

// Get messages (non-reactive)
const messages = await rxdbService.getMessages(conv.id);

// Subscribe to messages (reactive)
rxdbService.getMessages$(conv.id).subscribe(msgs => {
  console.log('Messages updated:', msgs.length);
});

// Search
const results = await rxdbService.searchConversations('hello');
```

## Storage Details

### Why Dexie Storage?

RxDB supports multiple storage backends. We use **Dexie** (IndexedDB wrapper) because:

1. **Persistence**: Data survives app restarts (unlike memory storage)
2. **No IPC Required**: Runs entirely in renderer process
3. **Good Performance**: IndexedDB is optimized for structured data
4. **Electron Compatible**: Works well in Electron's Chromium environment
5. **No CSP Issues**: Unlike dev-mode plugin, doesn't load external resources

### Database Configuration

```typescript
const db = await createRxDatabase({
  name: 'goatedapp',           // Database name in IndexedDB
  storage: getRxStorageDexie(), // Dexie storage adapter
  multiInstance: false          // Single instance (Electron app)
});
```

### Indexes

The schemas define indexes for efficient queries:

- `conversations`: Indexed by `updatedAt` for sorting
- `messages`: Indexed by `conversationId`, `timestamp`, and compound `[conversationId, timestamp]`

## Reactive Updates

RxDB provides reactive queries via RxJS Observables. The `useConversations` hook subscribes to these:

```typescript
// In useConversations.ts
useEffect(() => {
  const sub = rxdbService.getConversations$().subscribe({
    next: (convs) => setConversations(convs),
    error: (err) => setError(err.message)
  });
  return () => sub.unsubscribe();
}, []);
```

This means:
- UI automatically updates when data changes
- No manual refresh needed
- Changes from any source are reflected immediately

## Error Handling

The hook provides error state for UI feedback:

```typescript
const { error, isLoading } = useConversations();

if (isLoading) return <Loading />;
if (error) return <Error message={error} />;
```

## Troubleshooting

### Common Issues

**DB9 Error (ignoreDuplicate)**
- Cause: React Strict Mode creates duplicate database instances
- Solution: Use singleton pattern with global window storage (already implemented)

**DVM1 Error (schema validators)**
- Cause: Dev-mode plugin requires schema validators
- Solution: Don't use dev-mode plugin in production; it's only for debugging

**CSP Errors**
- Cause: Dev-mode plugin tries to load iframe from rxdb.info
- Solution: Remove dev-mode plugin (not needed for basic functionality)

### Clearing Data

To clear all data during development:

1. Open DevTools → Application → IndexedDB
2. Delete the `goatedapp` database
3. Refresh the app

Or programmatically:

```typescript
import { closeDatabase } from './db/database';

// Close and clear
await closeDatabase();
indexedDB.deleteDatabase('goatedapp');
```

## Dependencies

```json
{
  "dependencies": {
    "rxdb": "^16.21.1",
    "rxjs": "^7.8.2"
  }
}
```

## Related Files

- Spec: `.kiro/specs/chat-persistence/`
- Schemas: `src/renderer/db/schemas.ts`
- Database: `src/renderer/db/database.ts`
- Service: `src/renderer/db/RxDBService.ts`
- Hook: `src/renderer/hooks/useConversations.ts`
- UI Integration: `src/renderer/App.tsx`
