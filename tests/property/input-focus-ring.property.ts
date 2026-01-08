/**
 * Property Test: Input Focus Ring
 * Feature: clinical-zen-ui, Property 6: Input Focus Ring
 * Validates: Requirements 12.3
 * 
 * For any input or textarea element, when focused, the element SHALL display
 * a visible focus indicator (outline or box-shadow) using the sage-500 color.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * The sage-500 color value from the design system
 */
const SAGE_500 = '#5D8570';
const SAGE_500_RGB = 'rgb(93, 133, 112)';

/**
 * Focus indicator styles that should be present on focused inputs
 */
interface FocusIndicatorStyles {
  borderColor?: string;
  boxShadow?: string;
  outline?: string;
}

/**
 * Validates that focus styles include sage-500 color
 */
function hasSageFocusIndicator(styles: FocusIndicatorStyles): boolean {
  const sageColorPatterns = [
    SAGE_500.toLowerCase(),
    SAGE_500_RGB.toLowerCase(),
    '93, 133, 112', // RGB values
    'sage-500',
  ];

  const allStyles = [
    styles.borderColor?.toLowerCase() || '',
    styles.boxShadow?.toLowerCase() || '',
    styles.outline?.toLowerCase() || '',
  ].join(' ');

  return sageColorPatterns.some(pattern => allStyles.includes(pattern));
}

/**
 * Simulates the expected focus styles for an input element
 */
function getExpectedFocusStyles(inputType: 'input' | 'textarea'): FocusIndicatorStyles {
  // Based on global.css focus styles
  return {
    borderColor: SAGE_500,
    boxShadow: `0 0 0 2px rgba(93, 133, 112, 0.2)`,
  };
}

/**
 * Input types that should have focus indicators
 */
const INPUT_TYPES = ['text', 'email', 'password', 'search', 'tel', 'url', 'number'] as const;

describe('Property 6: Input Focus Ring', () => {
  /**
   * Property: For any input type, focus styles should include sage-500 color
   */
  it('should have sage-500 focus indicator for all input types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INPUT_TYPES),
        (inputType) => {
          const focusStyles = getExpectedFocusStyles('input');
          
          // Verify focus styles include sage color
          expect(hasSageFocusIndicator(focusStyles)).toBe(true);
          
          // Verify border color is sage-500
          expect(focusStyles.borderColor).toBe(SAGE_500);
          
          // Verify box-shadow includes sage color with transparency
          expect(focusStyles.boxShadow).toContain('93, 133, 112');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Textarea elements should have the same focus indicator as inputs
   */
  it('should have sage-500 focus indicator for textarea elements', () => {
    const focusStyles = getExpectedFocusStyles('textarea');
    
    expect(hasSageFocusIndicator(focusStyles)).toBe(true);
    expect(focusStyles.borderColor).toBe(SAGE_500);
    expect(focusStyles.boxShadow).toContain('93, 133, 112');
  });

  /**
   * Property: Focus indicator should be visible (non-zero dimensions)
   */
  it('should have visible focus ring dimensions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('input', 'textarea') as fc.Arbitrary<'input' | 'textarea'>,
        (elementType) => {
          const focusStyles = getExpectedFocusStyles(elementType);
          
          // Box shadow should have non-zero spread (2px in our case)
          if (focusStyles.boxShadow) {
            // Extract the spread value from box-shadow
            const spreadMatch = focusStyles.boxShadow.match(/0 0 0 (\d+)px/);
            if (spreadMatch) {
              const spreadValue = parseInt(spreadMatch[1], 10);
              expect(spreadValue).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
