# Implementation Plan: MCP Client

## Overview

This implementation plan breaks down the MCP Client feature into discrete coding tasks. The implementation follows a bottom-up approach: first building the core MCP service in the main process, then the IPC layer, and finally the UI components.

## Tasks

- [x] 1. Install MCP SDK dependency
  - Add @modelcontextprotocol/sdk package to the project
  - Add Vercel AI SDK v6 packages (ai, @ai-sdk/google, @ai-sdk/mcp)
  - _Requirements: 3.1_

- [x] 2. Implement MCPService in main process
  - [x] 2.1 Create MCPService class with server connection management
    - Create src/main/services/MCPService.ts
    - Use @ai-sdk/mcp createMCPClient with stdio transport
    - Implement path validation (.py or .js extension)
    - Implement command selection (python/python3 for .py, node for .js)
    - Implement server process spawning via MCP client
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 2.2 Implement Tool Registry
    - Add tool storage and retrieval methods
    - Implement getAllTools() to aggregate tools from all MCP clients
    - Format tools for Vercel AI SDK consumption
    - _Requirements: 3.6, 3.8_
  
  - [x] 2.3 Implement AI chat with tool execution
    - Use @ai-sdk/google with Gemini 2.5 Pro model
    - Use generateText/streamText with maxSteps for tool loops
    - AI SDK handles tool execution automatically
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [x] 2.4 Implement disconnect and cleanup
    - Add disconnect() method to close MCP clients
    - Handle unexpected server disconnections
    - Clean up Tool Registry on disconnect
    - _Requirements: 3.7, 6.4_

  - [ ]* 2.5 Write property test for path validation
    - **Property 1: Path Extension Validation**
    - **Validates: Requirements 2.8, 7.2, 8.3**

  - [ ]* 2.6 Write property test for command selection
    - **Property 2: Command Selection by Extension**
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Implement IPC handlers
  - [x] 3.1 Add MCP IPC handlers in main process
    - Add mcp:connect handler with path validation
    - Add mcp:disconnect handler
    - Add mcp:listServers handler
    - Add mcp:listTools handler
    - Add mcp:executeTool handler with tool validation
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 3.2 Update preload script with MCP API
    - Extend window.api.mcp with new methods
    - Add proper TypeScript types for all methods
    - _Requirements: 8.1, 8.5_

  - [ ]* 3.3 Write property test for IPC validation
    - **Property 6: IPC Validation**
    - **Validates: Requirements 8.3, 8.4, 8.5**

- [x] 4. Integrate MCP tools with chat flow
  - [x] 4.1 Update chat handler to include MCP tools
    - Modify chat:send handler to get tools from MCPService
    - Include tools in Gemini API request
    - _Requirements: 4.1_
  
  - [x] 4.2 Handle tool calls from Gemini response
    - Detect tool_calls in Gemini response
    - Execute tools via MCPService
    - Send results back to Gemini
    - Support multiple sequential tool calls
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.3 Write property test for tool registry consistency
    - **Property 3: Tool Registry Consistency**
    - **Validates: Requirements 3.6, 3.8, 4.1, 6.4**

- [ ] 5. Checkpoint - Ensure backend integration works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create ConnectToolButton component
  - [x] 6.1 Create ConnectToolButton.tsx
    - Create aesthetic "+" icon button
    - Position in top-right corner of main content
    - Add hover effects consistent with Clinical Zen design
    - Display connected server count badge
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 6.2 Create ConnectToolButton.css
    - Style button with soft shadows, rounded corners
    - Add hover transition effects
    - Style count badge
    - _Requirements: 1.2, 1.4_

- [x] 7. Create ToolConnectionModal component
  - [x] 7.1 Create ToolConnectionModal.tsx
    - Create modal with backdrop
    - Add path input field with validation
    - Add Connect and Cancel buttons
    - Display loading state during connection
    - Display success/error notifications
    - Display list of connected servers
    - Add disconnect button for each server
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 6.1, 6.2, 6.3_
  
  - [x] 7.2 Create ToolConnectionModal.css
    - Style modal consistent with SettingsModal
    - Style input field and buttons
    - Style server list items
    - Add loading spinner animation
    - _Requirements: 2.5_

  - [ ]* 7.3 Write property test for server display completeness
    - **Property 5: Server Display Completeness**
    - **Validates: Requirements 6.2**

- [x] 8. Create useMCP hook
  - [x] 8.1 Create useMCP.ts hook
    - Manage connected servers state
    - Manage tools state
    - Provide connect/disconnect methods
    - Handle loading and error states
    - Poll for server status updates
    - _Requirements: 6.1, 6.4, 6.5_

- [x] 9. Integrate MCP UI into App
  - [x] 9.1 Add ConnectToolButton to App.tsx
    - Import and render ConnectToolButton
    - Wire up modal open/close state
    - Pass connected server count
    - _Requirements: 1.1, 1.3_
  
  - [x] 9.2 Add ToolConnectionModal to App.tsx
    - Import and render ToolConnectionModal
    - Wire up useMCP hook
    - Handle connect/disconnect callbacks
    - _Requirements: 2.4, 6.3_

- [ ] 10. Enhance Tool Execution UI
  - [ ] 10.1 Update ToolCallCard for MCP tool display
    - Add animated loading state
    - Add smooth success/error transitions
    - Ensure arguments are formatted and collapsible
    - Ensure results are formatted and collapsible
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 10.2 Update ToolCallCard.css for animations
    - Add keyframe animations for pending state
    - Add transition animations for state changes
    - _Requirements: 5.6_

  - [ ]* 10.3 Write property test for tool data formatting
    - **Property 4: Tool Data Formatting**
    - **Validates: Requirements 5.4, 5.5**

- [ ] 11. Implement error handling
  - [ ] 11.1 Add comprehensive error handling to MCPService
    - Handle path not found errors
    - Handle process spawn failures
    - Implement 30-second connection timeout
    - Implement 60-second execution timeout
    - Log all errors to console with full details
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 11.2 Write property test for error logging
    - **Property 7: Error Logging Completeness**
    - **Validates: Requirements 7.6**

- [ ] 12. Final checkpoint - Full integration test
  - Ensure all tests pass, ask the user if questions arise.
  - Test with a real MCP server (e.g., weather server example)

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
