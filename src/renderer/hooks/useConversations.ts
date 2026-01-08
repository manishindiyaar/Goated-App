/**
 * React Hook for Conversation Management
 * Requirements: 1.3, 2.1, 2.2, 3.2, 4.2, 8.1, 8.2
 * 
 * Provides reactive state management for conversations and messages
 * using RxDB subscriptions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Subscription } from 'rxjs';
import { rxdbService } from '../db/RxDBService';
import { ConversationDocument, MessageDocument, ToolCallData } from '../db/schemas';

export interface UseConversationsReturn {
  // State
  conversations: ConversationDocument[];
  activeConversationId: string | null;
  messages: MessageDocument[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setActiveConversationId: (id: string | null) => void;
  createConversation: () => Promise<ConversationDocument>;
  deleteConversation: (id: string) => Promise<void>;
  addMessage: (
    role: 'user' | 'assistant' | 'tool',
    content: string,
    toolCalls?: ToolCallData[]
  ) => Promise<MessageDocument>;
  searchConversations: (query: string) => Promise<ConversationDocument[]>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationDocument[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we've auto-selected a conversation
  const hasAutoSelected = useRef(false);

  // Initialize database and subscribe to conversations
  useEffect(() => {
    let conversationsSub: Subscription | null = null;
    let mounted = true;

    const init = async () => {
      try {
        await rxdbService.initialize();
        
        if (!mounted) return;
        
        // Subscribe to conversations list
        conversationsSub = rxdbService.getConversations$().subscribe({
          next: (convs) => {
            if (!mounted) return;
            setConversations(convs);
            
            // Auto-select most recent conversation on first load
            if (!hasAutoSelected.current && convs.length > 0) {
              setActiveConversationId(convs[0].id);
              hasAutoSelected.current = true;
            }
            
            setIsLoading(false);
          },
          error: (err) => {
            if (!mounted) return;
            console.error('[useConversations] Subscription error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load conversations');
            setIsLoading(false);
          }
        });
      } catch (err) {
        if (!mounted) return;
        console.error('[useConversations] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
        setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      conversationsSub?.unsubscribe();
    };
  }, []);

  // Subscribe to messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let messagesSub: Subscription | null = null;
    let mounted = true;

    // Small delay to ensure database is ready
    const timer = setTimeout(() => {
      try {
        messagesSub = rxdbService.getMessages$(activeConversationId).subscribe({
          next: (msgs) => {
            if (mounted) {
              setMessages(msgs);
            }
          },
          error: (err) => {
            console.error('[useConversations] Messages subscription error:', err);
          }
        });
      } catch (err) {
        console.error('[useConversations] Failed to subscribe to messages:', err);
      }
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
      messagesSub?.unsubscribe();
    };
  }, [activeConversationId]);

  // Create a new conversation
  const createConversation = useCallback(async (): Promise<ConversationDocument> => {
    const conv = await rxdbService.createConversation();
    setActiveConversationId(conv.id);
    return conv;
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string): Promise<void> => {
    await rxdbService.deleteConversation(id);
    
    // If we deleted the active conversation, switch to another
    if (activeConversationId === id) {
      // Find the next conversation to select
      const remaining = conversations.filter(c => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [activeConversationId, conversations]);

  // Add a message to the active conversation
  const addMessage = useCallback(async (
    role: 'user' | 'assistant' | 'tool',
    content: string,
    toolCalls?: ToolCallData[]
  ): Promise<MessageDocument> => {
    let convId = activeConversationId;
    
    // Create a new conversation if none is active
    if (!convId) {
      const conv = await createConversation();
      convId = conv.id;
    }
    
    return rxdbService.addMessage(convId, role, content, toolCalls);
  }, [activeConversationId, createConversation]);

  // Search conversations
  const searchConversations = useCallback(async (query: string): Promise<ConversationDocument[]> => {
    return rxdbService.searchConversations(query);
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    error,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    addMessage,
    searchConversations
  };
}
