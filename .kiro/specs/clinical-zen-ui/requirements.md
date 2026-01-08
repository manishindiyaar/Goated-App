# Requirements Document

## Introduction

This feature implements a "Clinical Zen" design system for GoatedApp, a desktop Electron application for clinical workflows. The design language shifts from "Software" to "Stationery" with a calm, intelligent, paper-like aesthetic. The UI replicates Claude's interface patterns but replaces the terracotta/brown color palette with Surgical Sage (green) and Slate Blue accents. The design targets Mac/Windows desktop with a sidebar-based layout adapted from mobile reference designs.

## Glossary

- **Clinical_Zen_Theme**: The overall design identity characterized by warm off-white backgrounds, serif headings, and sage green accents
- **Layout_Shell**: The root component containing the sidebar and main content area
- **Sidebar_Component**: The 260px left navigation panel with dark cream background containing conversation history and user profile
- **Main_Content_Area**: The flexible content region displaying the greeting, message list, or input area
- **Greeting_Component**: The empty state display with serif typography welcoming the user
- **Input_Area_Component**: The floating pill-style input bar at the bottom with text input and microphone button
- **Message_Bubble**: Individual message display component with role-specific styling
- **Tool_Call_Card**: Collapsible card displaying AI tool invocations and results
- **Design_Token**: A named value (color, spacing, typography) used consistently across the UI
- **Sage_Green**: The primary brand color (#5D8570) replacing Claude's terracotta
- **Slate_Blue**: The secondary accent color (#647D94) for tech/AI elements

## Requirements

### Requirement 1: Design Token System

**User Story:** As a developer, I want a centralized design token system, so that I can maintain consistent styling across all components.

#### Acceptance Criteria

1. THE Clinical_Zen_Theme SHALL define a background color token with value '#FBFBF9' (warm off-white)
2. THE Clinical_Zen_Theme SHALL define a surface color token with value '#FFFFFF' for cards and inputs
3. THE Clinical_Zen_Theme SHALL define primaryText color token with value '#1A1A1A' (soft black, never pure black)
4. THE Clinical_Zen_Theme SHALL define secondaryText color token with value '#6B6B6B' (muted grey)
5. THE Clinical_Zen_Theme SHALL define sage color scale: sage-50 '#F2F7F4', sage-100 '#E3EDE7', sage-500 '#5D8570', sage-700 '#3D5C4C'
6. THE Clinical_Zen_Theme SHALL define slateBlue color scale: slateBlue-50 '#F0F4F8', slateBlue-500 '#647D94', slateBlue-900 '#2A3B4C'
7. THE Clinical_Zen_Theme SHALL define serif font family as 'Newsreader, Merriweather, serif' for headings
8. THE Clinical_Zen_Theme SHALL define sans font family as 'Inter, sans-serif' for body text
9. WHEN rendering text, THE GoatedApp SHALL apply selection styling with sage-100 background and sage-900 text color

### Requirement 2: Desktop Layout Shell

**User Story:** As a clinician, I want a desktop-optimized layout with sidebar navigation, so that I can efficiently manage conversations and access features.

#### Acceptance Criteria

1. THE Layout_Shell SHALL render a flex container spanning full viewport height and width
2. THE Layout_Shell SHALL apply the background color '#FBFBF9' and primaryText color '#1A1A1A'
3. THE Layout_Shell SHALL apply the sans font family as the default body font
4. THE Sidebar_Component SHALL have a fixed width of 260px and flex-shrink of 0
5. THE Sidebar_Component SHALL have background color '#F7F7F5' (slightly darker cream)
6. THE Sidebar_Component SHALL have a right border with color 'gray-200'
7. THE Sidebar_Component SHALL include a drag region spacer at the top for Mac traffic light buttons (24px height)
8. THE Main_Content_Area SHALL occupy remaining width with flex-1 and min-width of 0
9. THE Main_Content_Area SHALL be a flex column container positioned relative

### Requirement 3: Sidebar New Session Button

**User Story:** As a clinician, I want a prominent new session button, so that I can quickly start fresh conversations.

#### Acceptance Criteria

1. THE Sidebar_Component SHALL render a "New Session" button within 16px horizontal padding and 24px bottom margin
2. THE "New Session" button SHALL span full width with flex layout and space-between alignment
3. THE "New Session" button SHALL have background color sage-50 and text color sage-700
4. WHEN hovering over the "New Session" button, THE button SHALL transition to sage-100 background
5. THE "New Session" button SHALL have 8px border radius, sage-100 border, and subtle shadow
6. THE "New Session" button SHALL contain a plus icon in a white pill with shadow that scales up on hover
7. THE "New Session" button text SHALL use 14px font size with medium font weight

### Requirement 4: Sidebar Conversation History

**User Story:** As a clinician, I want to see my conversation history organized by time, so that I can quickly return to previous sessions.

#### Acceptance Criteria

1. THE Sidebar_Component SHALL render a scrollable conversation history list with flex-1 and overflow-y auto
2. THE conversation history SHALL display section headers (e.g., "Today") in uppercase, 12px font, gray-400 color with wider letter spacing
3. EACH conversation item SHALL display a truncated label text
4. WHEN a conversation item is active, THE item SHALL have a visually distinct background
5. THE conversation items SHALL have 8px horizontal padding and 4px vertical spacing between items

### Requirement 5: Sidebar User Profile

**User Story:** As a clinician, I want to see my profile and access settings from the sidebar, so that I can manage my account.

#### Acceptance Criteria

1. THE Sidebar_Component SHALL render a user profile section at the bottom with 16px padding and top border (gray-200)
2. THE user profile section SHALL display a circular avatar (32px) with slateBlue-500 background and white serif initials
3. THE user profile section SHALL display the user's name in 14px medium font weight
4. WHEN hovering over the user profile section, THE section SHALL show a subtle gray background (gray-200/50)
5. THE user profile section SHALL have 8px border radius and pointer cursor

### Requirement 6: Greeting Empty State

**User Story:** As a clinician, I want a welcoming empty state when starting the app, so that I feel oriented and ready to begin.

#### Acceptance Criteria

1. THE Greeting_Component SHALL be centered vertically and horizontally in the Main_Content_Area with bottom padding of 128px
2. THE Greeting_Component SHALL display an icon container (64px) with sage-50 background, 16px border radius, and subtle shadow
3. THE icon inside the container SHALL be 32px in sage-500 color
4. THE Greeting_Component SHALL display a heading in serif font, 40-50px responsive size, primaryText color, tight letter tracking
5. THE Greeting_Component SHALL display a subtitle in secondaryText color, 18px font, light weight, max-width ~448px, centered
6. THE Greeting_Component SHALL display a status indicator showing "System Secure & Offline" in sage-500 color, 14px medium font with a bullet point

### Requirement 7: Input Area Floating Bar

**User Story:** As a clinician, I want a floating input bar at the bottom, so that I can easily type or dictate commands.

#### Acceptance Criteria

1. THE Input_Area_Component SHALL be positioned absolute at the bottom with 24px padding on all sides
2. THE Input_Area_Component SHALL have a gradient background fading from transparent at top to background color at bottom
3. THE input container SHALL have max-width of 768px and be centered horizontally
4. THE input container SHALL have surface background (#FFFFFF), 16px border radius, and shadow-lg
5. WHEN not listening, THE input container SHALL have gray-200 border
6. WHEN listening, THE input container SHALL have sage-500 border with a 4px sage-500/10 ring
7. THE textarea inside SHALL have transparent background, no border, no focus ring, 16px padding, minimum height 60px, and no resize
8. THE textarea placeholder SHALL read "Dictate command or type..." in gray-400 color

### Requirement 8: Input Area Action Buttons

**User Story:** As a clinician, I want clear action buttons for attachments and voice input, so that I can interact efficiently.

#### Acceptance Criteria

1. THE Input_Area_Component SHALL render a footer row with space-between layout, 16px horizontal padding, and 12px bottom padding
2. THE attachment button SHALL be positioned on the left with gray-400 color, transitioning to gray-600 on hover
3. THE microphone button SHALL be positioned on the right with 8px padding and 8px border radius
4. WHEN not listening, THE microphone button SHALL have sage-50 background and sage-700 icon color, transitioning to sage-100 on hover
5. WHEN listening, THE microphone button SHALL have sage-500 background, white icon, shadow, and 105% scale
6. WHEN listening, THE microphone button SHALL display a pulsing waveform icon and "Listening..." text in 14px medium font
7. THE Input_Area_Component SHALL display a disclaimer below the input: "Patient data remains local. AI may display generated content." in 12px gray-400 centered text

### Requirement 9: Message Display

**User Story:** As a clinician, I want clear visual distinction between my messages and AI responses, so that I can follow the conversation easily.

#### Acceptance Criteria

1. EACH Message_Bubble SHALL have max-width of 768px and be centered with auto horizontal margins and 32px bottom margin
2. WHEN the message role is 'assistant', THE Message_Bubble SHALL align to the left (justify-start)
3. WHEN the message role is 'user', THE Message_Bubble SHALL align to the right (justify-end)
4. WHEN the message role is 'assistant', THE Message_Bubble SHALL display an avatar (32px) with sage-100 background, 8px border radius, sage-700 icon, and 16px right margin
5. WHEN the message role is 'assistant', THE message content SHALL have no background, primaryText color, and sans font
6. WHEN the message role is 'user', THE message content SHALL have '#F0F0EE' background, 16px horizontal padding, 12px vertical padding, 16px border radius, and serif font
7. THE message content text SHALL be 16px with relaxed line height (1.625)

### Requirement 10: Tool Call Display

**User Story:** As a clinician, I want to see when the AI uses tools, so that I understand what actions are being taken on my behalf.

#### Acceptance Criteria

1. WHEN an assistant message contains tool_calls, THE Message_Bubble SHALL render a Tool_Call_Card component
2. THE Tool_Call_Card SHALL be collapsible with a header showing tool name and status icon
3. THE Tool_Call_Card SHALL have a light sage background with a sage left border accent
4. THE Tool_Call_Card SHALL display a preview of the tool result when collapsed
5. WHEN expanded, THE Tool_Call_Card SHALL show the full tool arguments and result

### Requirement 11: Typography Scale

**User Story:** As a clinician, I want consistent, readable typography, so that I can focus on content without visual strain.

#### Acceptance Criteria

1. THE Clinical_Zen_Theme SHALL define heading-1 as serif font, 48px size, 1.25 line height, tight letter tracking
2. THE Clinical_Zen_Theme SHALL define heading-2 as serif font, 40px size, 1.25 line height
3. THE Clinical_Zen_Theme SHALL define heading-3 as serif font, 32px size, 1.25 line height
4. THE Clinical_Zen_Theme SHALL define body text as sans font, 16px size, 1.5 line height
5. THE Clinical_Zen_Theme SHALL define small text as sans font, 14px size, 1.5 line height
6. THE Clinical_Zen_Theme SHALL define caption text as sans font, 12px size, 1.5 line height

### Requirement 12: Interactive States and Transitions

**User Story:** As a clinician, I want smooth, subtle interactions, so that the interface feels responsive without being distracting.

#### Acceptance Criteria

1. ALL interactive elements SHALL have transition duration of 200ms with ease timing
2. WHEN hovering over buttons, THE button SHALL show appropriate hover state color change
3. WHEN focusing on inputs, THE input SHALL show a sage-500 focus ring (2px)
4. THE microphone button listening state SHALL include a pulse animation on the waveform icon
5. ALL color transitions SHALL be smooth without jarring changes

### Requirement 13: Responsive Sidebar Behavior

**User Story:** As a clinician using different screen sizes, I want the sidebar to adapt appropriately, so that I have optimal workspace.

#### Acceptance Criteria

1. WHEN viewport width is less than 1024px, THE Sidebar_Component SHALL be collapsible
2. WHEN the sidebar is collapsed, THE Layout_Shell SHALL display a hamburger menu toggle in the header area
3. WHEN the hamburger toggle is clicked, THE Sidebar_Component SHALL slide in as an overlay
4. THE sidebar collapse/expand transition SHALL be smooth (200-300ms duration)

