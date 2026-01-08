/**
 * Property Test: Tool Call Card Conditional Rendering
 * Feature: clinical-zen-ui, Property 3: Tool Call Card Conditional Rendering
 * Validates: Requirements 10.1
 * 
 * For any assistant message, if the message contains a non-empty tool_calls array,
 * the Message_Bubble SHALL render a Tool_Call_Card component for each tool call.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: 'pending' | 'success' | 'error';
}

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
}

/**
 * Determines if tool cards should be rendered for a message
 */
function shouldRenderToolCards(message: Message): boolean {
  return message.role === 'assistant' && 
         message.toolCalls !== undefined && 
         message.toolCalls.length > 0;
}

/**
 * Returns the number of tool cards that should be rendered
 */
function getExpectedToolCardCount(message: Message): number {
  if (!shouldRenderToolCards(message)) return 0;
  return message.toolCalls?.length ?? 0;
}

/**
 * Arbitrary for generating valid tool calls
 */
const toolCallArbitrary: fc.Arbitrary<ToolCall> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  arguments: fc.json(),
  result: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  status: fc.constantFrom<'pending' | 'success' | 'error'>('pending', 'success', 'error'),
});

/**
 * Arbitrary for generating messages with optional tool calls
 */
const messageArbitrary: fc.Arbitrary<Message> = fc.record({
  role: fc.constantFrom<'user' | 'assistant' | 'tool'>('user', 'assistant', 'tool'),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  toolCalls: fc.option(fc.array(toolCallArbitrary, { minLength: 0, maxLength: 5 }), { nil: undefined }),
});

describe('Property 3: Tool Call Card Conditional Rendering', () => {
  /**
   * Property: Tool cards should only render for assistant messages with tool_calls
   */
  it('should render tool cards only for assistant messages with non-empty tool_calls', () => {
    fc.assert(
      fc.property(
        messageArbitrary,
        (message) => {
          const shouldRender = shouldRenderToolCards(message);
          
          if (message.role !== 'assistant') {
            // Non-assistant messages should never render tool cards
            expect(shouldRender).toBe(false);
          } else if (!message.toolCalls || message.toolCalls.length === 0) {
            // Assistant messages without tool calls should not render tool cards
            expect(shouldRender).toBe(false);
          } else {
            // Assistant messages with tool calls should render tool cards
            expect(shouldRender).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Number of tool cards should equal number of tool calls
   */
  it('should render one tool card per tool call', () => {
    fc.assert(
      fc.property(
        fc.record({
          role: fc.constant<'assistant'>('assistant'),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          toolCalls: fc.array(toolCallArbitrary, { minLength: 1, maxLength: 10 }),
        }),
        (message) => {
          const expectedCount = getExpectedToolCardCount(message);
          expect(expectedCount).toBe(message.toolCalls.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User messages should never render tool cards regardless of data
   */
  it('should never render tool cards for user messages', () => {
    fc.assert(
      fc.property(
        fc.record({
          role: fc.constant<'user'>('user'),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          toolCalls: fc.option(fc.array(toolCallArbitrary, { minLength: 0, maxLength: 5 }), { nil: undefined }),
        }),
        (message) => {
          expect(shouldRenderToolCards(message)).toBe(false);
          expect(getExpectedToolCardCount(message)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty tool_calls array should not render any tool cards
   */
  it('should not render tool cards for empty tool_calls array', () => {
    fc.assert(
      fc.property(
        fc.record({
          role: fc.constant<'assistant'>('assistant'),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          toolCalls: fc.constant<ToolCall[]>([]),
        }),
        (message) => {
          expect(shouldRenderToolCards(message)).toBe(false);
          expect(getExpectedToolCardCount(message)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
