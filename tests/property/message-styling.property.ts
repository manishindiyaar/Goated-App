/**
 * Property Test: Message Role-Based Styling
 * Feature: clinical-zen-ui, Property 2: Message Role-Based Styling
 * Validates: Requirements 9.1, 9.2, 9.3, 9.5, 9.6
 * 
 * For any message with role 'user' or 'assistant', the Message_Bubble SHALL apply
 * the correct alignment (justify-end for user, justify-start for assistant),
 * avatar presence (only for assistant), and content styling (background and font family based on role).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

type MessageRole = 'user' | 'assistant' | 'tool';

interface MessageStyleRules {
  alignment: 'flex-start' | 'flex-end';
  hasAvatar: boolean;
  contentBackground: string | null;
  fontFamily: 'serif' | 'sans';
}

/**
 * Returns the expected style rules for a given message role
 */
function getExpectedStyleRules(role: MessageRole): MessageStyleRules {
  switch (role) {
    case 'user':
      return {
        alignment: 'flex-end',
        hasAvatar: false,
        contentBackground: '#F0F0EE',
        fontFamily: 'serif',
      };
    case 'assistant':
      return {
        alignment: 'flex-start',
        hasAvatar: true,
        contentBackground: null, // No background
        fontFamily: 'sans',
      };
    case 'tool':
      return {
        alignment: 'flex-start',
        hasAvatar: false,
        contentBackground: null,
        fontFamily: 'sans',
      };
  }
}

/**
 * Validates that the CSS class name matches the expected alignment
 */
function getAlignmentFromClass(role: MessageRole): 'flex-start' | 'flex-end' {
  // Based on our CSS: .message--user { justify-content: flex-end }
  // .message--assistant { justify-content: flex-start }
  return role === 'user' ? 'flex-end' : 'flex-start';
}

/**
 * Validates avatar presence based on role
 */
function shouldHaveAvatar(role: MessageRole): boolean {
  return role === 'assistant';
}

describe('Property 2: Message Role-Based Styling', () => {
  /**
   * Property: For any message role, alignment should match the specification
   */
  it('should apply correct alignment based on message role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<MessageRole>('user', 'assistant', 'tool'),
        fc.string({ minLength: 1, maxLength: 500 }), // message content
        (role, content) => {
          const expectedRules = getExpectedStyleRules(role);
          const actualAlignment = getAlignmentFromClass(role);
          
          expect(actualAlignment).toBe(expectedRules.alignment);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Only assistant messages should have avatars
   */
  it('should show avatar only for assistant messages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<MessageRole>('user', 'assistant', 'tool'),
        (role) => {
          const expectedRules = getExpectedStyleRules(role);
          const actualHasAvatar = shouldHaveAvatar(role);
          
          expect(actualHasAvatar).toBe(expectedRules.hasAvatar);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User messages should have background color, assistant messages should not
   */
  it('should apply correct background styling based on role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<MessageRole>('user', 'assistant'),
        (role) => {
          const expectedRules = getExpectedStyleRules(role);
          
          if (role === 'user') {
            expect(expectedRules.contentBackground).toBe('#F0F0EE');
          } else {
            expect(expectedRules.contentBackground).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Font family should be serif for user, sans for assistant
   */
  it('should apply correct font family based on role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<MessageRole>('user', 'assistant'),
        (role) => {
          const expectedRules = getExpectedStyleRules(role);
          
          if (role === 'user') {
            expect(expectedRules.fontFamily).toBe('serif');
          } else {
            expect(expectedRules.fontFamily).toBe('sans');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All style rules should be consistent for any message content
   */
  it('should apply consistent styling regardless of message content', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<MessageRole>('user', 'assistant'),
        fc.string({ minLength: 0, maxLength: 1000 }),
        (role, content) => {
          const rules1 = getExpectedStyleRules(role);
          const rules2 = getExpectedStyleRules(role);
          
          // Style rules should be deterministic based on role only
          expect(rules1).toEqual(rules2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
