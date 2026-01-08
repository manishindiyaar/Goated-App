/**
 * RxDB Schema Definitions for Chat Persistence
 * Requirements: 1.4, 5.1, 5.3
 */

import { RxJsonSchema } from 'rxdb';

// Tool call data structure for assistant messages
export interface ToolCallData {
  id: string;
  name: string;
  arguments: string;
  status: 'pending' | 'success' | 'error';
  result?: string;
}

// Conversation document interface
export interface ConversationDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preview: string;
}

// Message document interface
export interface MessageDocument {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallData[];
}

// Conversation schema with validation
export const conversationSchema: RxJsonSchema<ConversationDocument> = {
  version: 0,
  title: 'conversation schema',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    title: { type: 'string', maxLength: 200 },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    preview: { type: 'string', maxLength: 500 }
  },
  required: ['id', 'title', 'createdAt', 'updatedAt', 'preview'],
  indexes: ['updatedAt']
};

// Message schema with validation
export const messageSchema: RxJsonSchema<MessageDocument> = {
  version: 0,
  title: 'message schema',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    conversationId: { type: 'string', maxLength: 36 },
    role: { type: 'string', enum: ['user', 'assistant', 'tool'], maxLength: 10 },
    content: { type: 'string' },
    timestamp: { type: 'number' },
    toolCalls: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          arguments: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'success', 'error'] },
          result: { type: 'string' }
        },
        required: ['id', 'name', 'arguments', 'status']
      }
    }
  },
  required: ['id', 'conversationId', 'role', 'content', 'timestamp'],
  indexes: ['conversationId', 'timestamp', ['conversationId', 'timestamp']]
};
