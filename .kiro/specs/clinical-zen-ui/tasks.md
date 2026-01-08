# Implementation Plan: Clinical Zen UI

## Overview

This implementation plan transforms GoatedApp's visual identity to the "Clinical Zen" design system. Tasks are organized to build foundational design tokens first, then update existing components incrementally. Each task builds on previous work to ensure no orphaned styles.

## Tasks

- [x] 1. Design Token Foundation
  - [x] 1.1 Update global.css with Clinical Zen color tokens
    - Replace existing color variables with new palette
    - Add sage scale: sage-50, sage-100, sage-500, sage-700
    - Add slateBlue scale: slateBlue-50, slateBlue-500, slateBlue-900
    - Update background to #FBFBF9, surface to #FFFFFF
    - Update text colors: primaryText #1A1A1A, secondaryText #6B6B6B
    - Update sidebar background to #F7F7F5
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Add typography tokens and font imports
    - Add Google Fonts import for Newsreader and Inter
    - Define --font-serif and --font-sans variables
    - Update font size scale: caption 12px, small 14px, body 16px, h3 32px, h2 40px, h1 48px
    - Add line-height variables for body (1.5) and heading (1.25)
    - _Requirements: 1.7, 1.8, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 1.3 Update spacing and border radius tokens
    - Update spacing scale to match design (4, 8, 12, 16, 24, 32, 48, 64, 128)
    - Update border radius: sm 4px, md 8px, lg 16px
    - Update shadow definitions for sm, md, lg
    - _Requirements: Design tokens_

  - [x] 1.4 Add selection and transition styles
    - Add ::selection styles with sage-100 background
    - Ensure transition-normal is 200ms ease
    - _Requirements: 1.9, 12.1_

- [x] 2. Checkpoint - Verify design tokens
  - Ensure all CSS variables are defined correctly
  - Test that fonts load properly
  - Ask the user if questions arise

- [x] 3. Layout Shell Update
  - [x] 3.1 Update Layout container styles
    - Apply background color #FBFBF9
    - Apply primaryText color #1A1A1A
    - Apply sans font family as default
    - Ensure full viewport height and width
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Update Sidebar base styles
    - Set width to 260px with flex-shrink: 0
    - Apply sidebar background #F7F7F5
    - Add right border with gray-200 color
    - Add drag region spacer (24px height) for Mac traffic lights
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [x] 3.3 Update Main Content Area styles
    - Set flex: 1 and min-width: 0
    - Set display: flex, flex-direction: column, position: relative
    - _Requirements: 2.8, 2.9_

- [x] 4. Sidebar Components
  - [x] 4.1 Implement New Session button styling
    - Apply sage-50 background, sage-700 text
    - Add sage-100 border, 8px border radius, subtle shadow
    - Implement hover state with sage-100 background
    - Add plus icon in white pill with hover scale effect
    - Set 14px font size, medium weight
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 4.2 Implement Conversation History styling
    - Create scrollable container with flex-1, overflow-y: auto
    - Style section headers: uppercase, 12px, gray-400, letter-spacing
    - Style history items with 8px horizontal padding
    - Add active state with distinct background
    - Implement text truncation for long labels
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.3 Write property test for text truncation
    - **Property 1: Conversation Item Text Truncation**
    - **Validates: Requirements 4.3**

  - [x] 4.4 Implement User Profile section styling
    - Add 16px padding and top border (gray-200)
    - Style avatar: 32px circle, slateBlue-500 background, white serif initials
    - Style name: 14px, medium weight
    - Add hover state with subtle gray background
    - Set 8px border radius and pointer cursor
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Checkpoint - Verify sidebar styling
  - Test New Session button hover states
  - Test conversation history scrolling and truncation
  - Test user profile hover state
  - Ask the user if questions arise

- [x] 6. Greeting Component
  - [x] 6.1 Create Greeting component structure
    - Create Greeting.tsx component file
    - Accept userName and statusMessage props
    - Render icon container, heading, subtitle, and status
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.2 Style Greeting component
    - Center vertically and horizontally with 128px bottom padding
    - Style icon container: 64px, sage-50 background, 16px radius, shadow
    - Style icon: 32px, sage-500 color
    - Style heading: serif font, 40-50px responsive, tight tracking
    - Style subtitle: secondaryText, 18px, light weight, max-width 448px
    - Style status: sage-500, 14px medium, bullet point prefix
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 7. Input Area Component
  - [x] 7.1 Update Input Area positioning and container
    - Position absolute at bottom with 24px padding
    - Add gradient background (transparent to background color)
    - Set max-width 768px, centered
    - Style container: white background, 16px radius, shadow-lg
    - Add default gray-200 border
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.2 Implement listening state styling
    - Add sage-500 border when listening
    - Add 4px sage-500/10 ring when listening
    - _Requirements: 7.6_

  - [x] 7.3 Style textarea and placeholder
    - Transparent background, no border, no focus ring
    - 16px padding, min-height 60px, no resize
    - Placeholder: "Dictate command or type..." in gray-400
    - _Requirements: 7.7, 7.8_

  - [x] 7.4 Style action buttons
    - Footer row: space-between, 16px horizontal padding, 12px bottom padding
    - Attachment button: left, gray-400, hover gray-600
    - Microphone button: right, 8px padding, 8px radius
    - Idle state: sage-50 background, sage-700 icon, hover sage-100
    - Listening state: sage-500 background, white icon, shadow, 105% scale
    - Add pulse animation on waveform icon when listening
    - Add "Listening..." text when active
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 7.5 Add disclaimer text
    - Center below input, 12px, gray-400
    - Text: "Patient data remains local. AI may display generated content."
    - _Requirements: 8.7_

  - [x] 7.6 Write property test for input focus ring
    - **Property 6: Input Focus Ring**
    - **Validates: Requirements 12.3**

- [x] 8. Checkpoint - Verify input area
  - Test listening state toggle
  - Test textarea focus behavior
  - Test microphone button animation
  - Ask the user if questions arise

- [x] 9. Message Components
  - [x] 9.1 Create Message component with role-based styling
    - Create Message.tsx component
    - Accept role, content, timestamp, toolCalls props
    - Apply max-width 768px, centered, 32px bottom margin
    - Align user messages right (justify-end)
    - Align assistant messages left (justify-start)
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 9.2 Style assistant messages
    - Add avatar: 32px, sage-100 background, 8px radius, sage-700 icon
    - Avatar has 16px right margin
    - Content: no background, primaryText, sans font
    - Text: 16px, line-height 1.625
    - _Requirements: 9.4, 9.5, 9.7_

  - [x] 9.3 Style user messages
    - Content: #F0F0EE background, 16px horizontal padding, 12px vertical padding
    - 16px border radius, serif font
    - Text: 16px, line-height 1.625
    - _Requirements: 9.6, 9.7_

  - [x] 9.4 Write property test for message role-based styling
    - **Property 2: Message Role-Based Styling**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5, 9.6**

- [x] 10. Tool Call Card Component
  - [x] 10.1 Create ToolCallCard component
    - Create ToolCallCard.tsx component
    - Accept toolCall prop with name, arguments, result, status
    - Implement collapsible behavior with expand/collapse toggle
    - _Requirements: 10.1, 10.2_

  - [x] 10.2 Style Tool Call Card
    - Light sage background (#E6F4F1)
    - 3px sage-500 left border
    - 8px border radius
    - Header: tool name, status icon, clickable
    - Collapsed: show result preview
    - Expanded: show full arguments and result
    - _Requirements: 10.3, 10.4, 10.5_

  - [x] 10.3 Write property test for tool card rendering
    - **Property 3: Tool Call Card Conditional Rendering**
    - **Validates: Requirements 10.1**

- [x] 11. Interactive States
  - [x] 11.1 Ensure all buttons have consistent transitions
    - Verify all buttons have transition: 200ms ease
    - Verify hover states change background or color
    - _Requirements: 12.1, 12.2_

  - [x] 11.2 Write property test for interactive element transitions
    - **Property 4: Interactive Element Transition Consistency**
    - **Validates: Requirements 12.1**

  - [x] 11.3 Write property test for button hover states
    - **Property 5: Button Hover State Change**
    - **Validates: Requirements 12.2**

- [x] 12. Responsive Sidebar
  - [x] 12.1 Implement sidebar collapse behavior
    - Add collapsed state management
    - Hide sidebar when viewport < 1024px
    - Show hamburger menu toggle in header when collapsed
    - _Requirements: 13.1, 13.2_

  - [x] 12.2 Implement sidebar slide-in overlay
    - Sidebar slides in from left as overlay when toggle clicked
    - Add smooth transition (200-300ms)
    - Add backdrop overlay when sidebar is open on mobile
    - _Requirements: 13.3, 13.4_

- [x] 13. Final Integration
  - [x] 13.1 Update App.tsx to use new components
    - Import and use Greeting component for empty state
    - Import and use updated Message components
    - Wire up sidebar collapse state
    - Ensure all styling is applied correctly
    - _Requirements: All_

  - [x] 13.2 Remove old styling and clean up
    - Remove deprecated CSS classes
    - Remove unused color variables
    - Ensure no style conflicts
    - _Requirements: All_

- [x] 14. Final Checkpoint - Full UI testing
  - Test complete layout on desktop (1200px+)
  - Test responsive behavior at 1024px breakpoint
  - Test all hover and focus states
  - Test message display with both roles
  - Test tool call card expand/collapse
  - Ensure all tests pass
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Visual regression tests recommended for final verification
