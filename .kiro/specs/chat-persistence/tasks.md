# Implementation Plan: Chat Persistence with RxDB

## Overview

This implementation plan adds persistent chat storage to GoatedApp using RxDB. The approach follows RxDB's recommended Electron architecture with storage in the main process and database access from the renderer. Tasks are ordered to build incrementally, with core database setup first, then service layer, then React integration.

## Tasks

- [x] 1. Install RxDB dependencies and configure project
  - Install rxdb, rxjs packages
  - Add RxDB plugins for Electron and IndexedDB storage
  - Update TypeScript configuration if needed
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Create RxDB schema definitions
  - [x] 2.1 Create conversation and message schemas in `src/renderer/db/schemas.ts`
    - Define ConversationDocument and MessageDocument interfaces
    - Define conversationSchema with id, title, createdAt, updatedAt, preview
    - Define messageSchema with id, conversationId, role, content, timestamp, toolCalls
    - Add indexes for updatedAt and conversationId
    - _Requirements: 1.4, 5.1, 5.3_

  - [ ]* 2.2 Write property test for schema validation (Property 8)
    - **Property 8: Schema Validation**
    - Test that documents missing required fields are rejected
    - **Validates: Requirements 5.1, 5.3**

- [ ] 3. Set up main process RxDB storage
  - [x] 3.1 Create `src/main/db/setupStorage.ts`
    - Import and configure exposeIpcMainRxStorage
    - Use IndexedDB storage adapter
    - Export setupMainProcessStorage function
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Integrate storage setup into main process `src/main/index.ts`
    - Call setupMainProcessStorage in app.whenReady()
    - _Requirements: 1.1, 1.2_

- [ ] 4. Create renderer process database service
  - [x] 4.1 Create `src/renderer/db/database.ts`
    - Set up getRxStorageIpcRenderer connection
    - Create database with conversations and messages collections
    - Implement singleton pattern for database instance
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.2 Create `src/renderer/db/RxDBService.ts` with core operations
    - Implement initialize() method
    - Implement createConversation() with UUID generation
    - Implement deleteConversation() with cascade delete
    - Implement addMessage() with conversation preview update
    - _Requirements: 1.1, 1.2, 3.1, 3.3, 3.4, 4.1_

  - [ ]* 4.3 Write property test for message persistence (Property 1)
    - **Property 1: Message Persistence**
    - Test that any valid message is retrievable after adding
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [ ]* 4.4 Write property test for conversation creation (Property 5)
    - **Property 5: Conversation Creation with Unique ID**
    - Test that N calls create N distinct conversations with unique IDs
    - **Validates: Requirements 3.1, 3.4**

  - [ ]* 4.5 Write property test for cascade deletion (Property 7)
    - **Property 7: Cascade Deletion**
    - Test that deleting conversation removes all associated messages
    - **Validates: Requirements 4.1**

- [x] 5. Checkpoint - Ensure core database operations work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement reactive queries and subscriptions
  - [x] 6.1 Add getConversations$() observable to RxDBService
    - Return conversations sorted by updatedAt descending
    - _Requirements: 2.1, 2.4_

  - [x] 6.2 Add getMessages$(conversationId) observable to RxDBService
    - Return messages for conversation sorted by timestamp ascending
    - _Requirements: 2.2, 2.4_

  - [ ]* 6.3 Write property test for conversation ordering (Property 2)
    - **Property 2: Conversation Ordering**
    - Test that conversations are returned in descending updatedAt order
    - **Validates: Requirements 2.1**

  - [ ]* 6.4 Write property test for message retrieval (Property 3)
    - **Property 3: Message Retrieval by Conversation**
    - Test that all messages for a conversation are returned in order
    - **Validates: Requirements 2.2**

  - [ ]* 6.5 Write property test for reactive emissions (Property 4)
    - **Property 4: Reactive Subscription Emission**
    - Test that observables emit on create/delete/add operations
    - **Validates: Requirements 2.4, 8.2**

  - [ ]* 6.6 Write property test for preview update (Property 6)
    - **Property 6: Conversation Preview Update**
    - Test that adding message updates conversation preview and timestamp
    - **Validates: Requirements 2.3, 3.3, 8.1**

- [ ] 7. Implement search functionality
  - [x] 7.1 Add searchConversations(query) method to RxDBService
    - Implement case-insensitive search across message content
    - Return matching conversations
    - _Requirements: 6.1, 6.3_

  - [ ]* 7.2 Write property test for search (Property 10)
    - **Property 10: Search Returns Matching Conversations**
    - Test that search returns only conversations with matching content
    - **Validates: Requirements 6.1**

  - [ ]* 7.3 Write property test for case-insensitive search (Property 11)
    - **Property 11: Case-Insensitive Search**
    - Test that uppercase and lowercase queries return same results
    - **Validates: Requirements 6.3**

- [x] 8. Checkpoint - Ensure service layer is complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement message round-trip and data integrity
  - [ ]* 9.1 Write property test for message round-trip (Property 12)
    - **Property 12: Message Round-Trip**
    - Test that stored messages with toolCalls are retrieved identically
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ]* 9.2 Write property test for failed operations (Property 9)
    - **Property 9: Failed Operations Preserve Data**
    - Test that failed inserts don't corrupt existing data
    - **Validates: Requirements 5.2**

- [ ] 10. Create React hook for conversation management
  - [x] 10.1 Create `src/renderer/hooks/useConversations.ts`
    - Initialize RxDBService on mount
    - Subscribe to conversations and messages observables
    - Manage activeConversationId state
    - Expose createConversation, deleteConversation, addMessage functions
    - Handle loading and error states
    - _Requirements: 1.3, 2.1, 2.2, 3.2, 4.2, 8.1, 8.2_

  - [x] 10.2 Add error handling types in `src/renderer/db/errors.ts`
    - Create DatabaseInitializationError class
    - Create ConversationNotFoundError class
    - _Requirements: 4.3, 5.4_

- [ ] 11. Integrate with App.tsx
  - [x] 11.1 Update App.tsx to use useConversations hook
    - Replace in-memory messages state with hook
    - Connect sidebar to conversation list
    - Wire up conversation selection
    - Update handleNewSession to use createConversation
    - Update handleSubmit to use addMessage
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2_

  - [x] 11.2 Update sidebar to display conversation history
    - Map conversations to conversation-item elements
    - Show preview and timestamp
    - Highlight active conversation
    - Add delete button for conversations
    - _Requirements: 2.3, 4.1, 4.2_

- [ ] 12. Update preload script for IPC
  - [x] 12.1 Expose ipcRenderer in preload for RxDB
    - Add electron.ipcRenderer to contextBridge
    - Ensure secure exposure pattern
    - _Requirements: 1.1, 1.2_

- [x] 13. Final checkpoint - Full integration testing
  - Ensure all tests pass, ask the user if questions arise.
  - Verify conversations persist across app restart
  - Verify sidebar updates reactively

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- RxDB in-memory storage will be used for testing to avoid IPC complexity
