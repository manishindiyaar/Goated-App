/**
 * Error Types for Chat Persistence
 * Requirements: 4.3, 5.4
 */

/**
 * Error thrown when database initialization fails.
 */
export class DatabaseInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseInitializationError';
  }
}

/**
 * Error thrown when a conversation is not found.
 */
export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = 'ConversationNotFoundError';
  }
}

/**
 * Error thrown when a message operation fails.
 */
export class MessageOperationError extends Error {
  constructor(operation: string, message: string) {
    super(`Message ${operation} failed: ${message}`);
    this.name = 'MessageOperationError';
  }
}
