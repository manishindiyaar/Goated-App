/**
 * RxDB Service for Chat Persistence
 * Requirements: 1.1, 1.2, 3.1, 3.3, 3.4, 4.1, 2.1, 2.2, 2.4, 6.1, 6.3
 * 
 * Provides CRUD operations and reactive queries for conversations and messages.
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getDatabase, GoatedDatabase } from './database';
import { ConversationDocument, MessageDocument, ToolCallData } from './schemas';

export class RxDBService {
  private db: GoatedDatabase | null = null;
  private initialized = false;

  /**
   * Initializes the database connection.
   * Must be called before any other operations.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    this.db = await getDatabase();
    this.initialized = true;
  }

  /**
   * Ensures the database is initialized before operations.
   */
  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('RxDBService not initialized. Call initialize() first.');
    }
  }

  // ============================================
  // Conversation Operations
  // ============================================

  /**
   * Creates a new conversation.
   * Requirements: 3.1, 3.4
   */
  async createConversation(title?: string): Promise<ConversationDocument> {
    this.ensureInitialized();
    
    const now = Date.now();
    const doc = await this.db!.conversations.insert({
      id: crypto.randomUUID(),
      title: title || 'New Conversation',
      createdAt: now,
      updatedAt: now,
      preview: ''
    });
    
    return doc.toJSON();
  }

  /**
   * Deletes a conversation and all its messages.
   * Requirements: 4.1
   */
  async deleteConversation(id: string): Promise<void> {
    this.ensureInitialized();
    
    // Delete all messages for this conversation first
    const messages = await this.db!.messages.find({
      selector: { conversationId: id }
    }).exec();
    
    await Promise.all(messages.map(msg => msg.remove()));
    
    // Delete the conversation
    const conversation = await this.db!.conversations.findOne(id).exec();
    if (conversation) {
      await conversation.remove();
    }
  }

  /**
   * Updates a conversation's title.
   */
  async updateConversationTitle(id: string, title: string): Promise<void> {
    this.ensureInitialized();
    
    const conversation = await this.db!.conversations.findOne(id).exec();
    if (conversation) {
      await conversation.patch({
        title,
        updatedAt: Date.now()
      });
    }
  }

  /**
   * Gets a reactive observable of all conversations sorted by last activity.
   * Requirements: 2.1, 2.4
   */
  getConversations$(): Observable<ConversationDocument[]> {
    this.ensureInitialized();
    
    return this.db!.conversations
      .find({
        sort: [{ updatedAt: 'desc' }]
      })
      .$
      .pipe(
        map(docs => docs.map(d => d.toJSON()))
      );
  }

  /**
   * Gets a single conversation by ID.
   */
  async getConversation(id: string): Promise<ConversationDocument | null> {
    this.ensureInitialized();
    
    const doc = await this.db!.conversations.findOne(id).exec();
    return doc ? doc.toJSON() : null;
  }

  // ============================================
  // Message Operations
  // ============================================

  /**
   * Adds a message to a conversation.
   * Requirements: 1.1, 1.2, 3.3
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'tool',
    content: string,
    toolCalls?: ToolCallData[]
  ): Promise<MessageDocument> {
    this.ensureInitialized();
    
    const now = Date.now();
    
    // Insert the message
    const message = await this.db!.messages.insert({
      id: crypto.randomUUID(),
      conversationId,
      role,
      content,
      timestamp: now,
      toolCalls
    });

    // Update conversation preview and timestamp
    const preview = content.slice(0, 100);
    const conversation = await this.db!.conversations.findOne(conversationId).exec();
    if (conversation) {
      await conversation.patch({
        preview,
        updatedAt: now
      });
    }

    // Return as mutable type
    const json = message.toJSON();
    return {
      ...json,
      toolCalls: json.toolCalls ? [...json.toolCalls] : undefined
    } as MessageDocument;
  }

  /**
   * Gets a reactive observable of messages for a conversation.
   * Requirements: 2.2, 2.4
   */
  getMessages$(conversationId: string): Observable<MessageDocument[]> {
    this.ensureInitialized();
    
    return this.db!.messages
      .find({
        selector: { conversationId },
        sort: [{ timestamp: 'asc' }]
      })
      .$
      .pipe(
        map(docs => docs.map(d => {
          const json = d.toJSON();
          return {
            ...json,
            toolCalls: json.toolCalls ? [...json.toolCalls] : undefined
          } as MessageDocument;
        }))
      );
  }

  /**
   * Gets all messages for a conversation (non-reactive).
   */
  async getMessages(conversationId: string): Promise<MessageDocument[]> {
    this.ensureInitialized();
    
    const docs = await this.db!.messages.find({
      selector: { conversationId },
      sort: [{ timestamp: 'asc' }]
    }).exec();
    
    return docs.map(d => {
      const json = d.toJSON();
      return {
        ...json,
        toolCalls: json.toolCalls ? [...json.toolCalls] : undefined
      } as MessageDocument;
    });
  }

  // ============================================
  // Search Operations
  // ============================================

  /**
   * Searches conversations by message content.
   * Requirements: 6.1, 6.3
   */
  async searchConversations(query: string): Promise<ConversationDocument[]> {
    this.ensureInitialized();
    
    if (!query.trim()) {
      return [];
    }
    
    const lowerQuery = query.toLowerCase();
    
    // Get all messages and filter by content
    const messages = await this.db!.messages.find().exec();
    
    // Find conversation IDs that have matching messages
    const matchingConversationIds = new Set(
      messages
        .filter(m => m.content.toLowerCase().includes(lowerQuery))
        .map(m => m.conversationId)
    );

    // Get matching conversations
    const conversations = await this.db!.conversations.find().exec();
    
    return conversations
      .filter(c => matchingConversationIds.has(c.id))
      .map(c => c.toJSON())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

// Export singleton instance
export const rxdbService = new RxDBService();
