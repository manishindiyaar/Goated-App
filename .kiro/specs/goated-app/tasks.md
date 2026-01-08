# Implementation Plan: GoatedApp

## Overview

This implementation plan breaks down the GoatedApp Electron application into incremental coding tasks. Each task builds on previous work, ensuring no orphaned code. The plan follows a bottom-up approach: core infrastructure first, then services, then UI components, and finally integration.

## Tasks

- [-] 1. Project Setup and Electron Shell
  - [x] 1.1 Initialize Electron project with TypeScript, React, and Vite
    - Create package.json with Electron 28+, React 18, TypeScript 5, Vite
    - Configure electron-builder for Mac/Windows packaging
    - Set up project structure: src/main, src/renderer, src/preload
    - _Requirements: 1.1, 1.2_

  - [ ] 1.2 Configure Electron main process with security settings
    - Create main/index.ts with BrowserWindow (1200x800 min)
    - Enable contextIsolation, disable nodeIntegration
    - Configure app paths for userData
    - _Requirements: 1.3, 1.4, 1.8_

  - [ ] 1.3 Create preload script with secure IPC bridge
    - Define window.api object with typed methods
    - Implement contextBridge.exposeInMainWorld
    - Set up ipcRenderer.invoke wrappers for all channels
    - _Requirements: 1.5, 1.6_

  - [ ]* 1.4 Write property test for IPC Bridge forwarding
    - **Property 1: IPC Bridge Request Forwarding**
    - **Validates: Requirements 1.6**

- [ ] 2. Checkpoint - Verify Electron shell launches correctly
  - Ensure the app launches with a blank window
  - Verify preload script exposes window.api
  - Ask the user if questions arise

- [ ] 3. Python Backend Setup
  - [x] 3.1 Create Python FastAPI server structure
    - Create python/ directory with requirements.txt
    - Implement FastAPI app with /v1/chat/completions endpoint
    - Define Pydantic models for ChatRequest, ChatResponse, ToolCall
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Implement model inference.

    - Initially we will use Gemini 3 Pro and then after all done we will shift to local model. (make sure to use latest doc and remember to keep the GEMINI_API_KEY in .env file)
    - *Not necessary now***Implement FunctionGemma model loading and inference
    - Configure n_ctx=8192, temperature=0.0
    - Implement tool_choice="auto" when tools provided
    - Handle model loading errors with HTTP 500
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.10_

  - [ ]* 3.3 Write property tests for backend request handling
    - **Property 9: Backend Request Schema Validation**
    - **Property 10: Backend Tool Choice Auto-Setting**
    - **Validates: Requirements 3.4, 3.8**

  - [ ]* 3.4 Write property test for backend response format
    - **Property 11: Backend Tool Call Response Format**
    - **Property 12: Backend Inference Error Handling**
    - **Validates: Requirements 3.9, 3.11**

- [ ] 4. Process Lifecycle Management
  - [ ] 4.1 Implement ProcessManager class in main process
    - Spawn Python process with child_process.spawn
    - Set MODEL_PATH environment variable
    - Capture stdout/stderr with "[FunctionGemma]" prefix
    - Store process reference and expose status check
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 4.2 Implement health check and restart logic
    - Health check every 10 seconds to http://127.0.0.1:8000/health
    - Restart after 3 consecutive health check failures
    - Restart after unexpected exit with 2s delay
    - Limit to 5 restarts within 60 seconds
    - _Requirements: 7.6, 7.7, 7.8, 7.9_

  - [ ] 4.3 Implement graceful shutdown
    - Send SIGTERM on 'will-quit' event
    - Wait up to 5 seconds for graceful exit
    - Send SIGKILL if process doesn't exit
    - Expose status via IPC 'backend:status'
    - _Requirements: 7.10, 7.11, 7.12_

  - [ ]* 4.4 Write property tests for process management
    - **Property 20: Process Output Capture**
    - **Property 21: Process Restart Policy**
    - **Validates: Requirements 7.4, 7.7, 7.8, 7.9**

- [ ] 5. Checkpoint - Verify Python backend integration
  - Ensure Python backend starts with Electron app
  - Verify health checks are working
  - Test restart behavior
  - Ask the user if questions arise

- [ ] 6. MCP Client Implementation
  - [ ] 6.1 Implement MCP Client core with @modelcontextprotocol/sdk
    - Create MCPClient class with connect/disconnect methods
    - Support stdio and SSE transports
    - Implement connection handshake (initialize + notifications/initialized)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 6.2 Implement tool discovery and invocation
    - Call tools/list after connection
    - Store tools in Tool_Registry with name, description, inputSchema
    - Implement callTool with tools/call request
    - Parse content array from responses
    - _Requirements: 2.6, 2.7, 2.8, 2.9_

  - [ ] 6.3 Implement error handling and reconnection
    - Propagate MCP server errors to caller
    - Emit 'disconnected' event on connection loss
    - Implement exponential backoff reconnection (1s, 2s, 4s... max 30s)
    - _Requirements: 2.10, 2.11_

  - [ ]* 6.4 Write property tests for MCP Client
    - **Property 2: MCP Connection Handshake Sequence**
    - **Property 3: MCP Tool Discovery Completeness**
    - **Property 4: MCP Tool Invocation Format**
    - **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.8**

  - [ ]* 6.5 Write property test for MCP JSON serialization
    - **Property 8: MCP JSON Serialization Round-Trip**
    - **Validates: Requirements 2.12**

- [x] 7. Whisper Service Implementation
  - [x] 7.1 Implement WhisperService class
    - Create TypeScript class using whisper-node
    - Store models in {userData}/models/whisper/
    - Support model sizes: base.en, small.en, medium.en, distil-large-v3
    - Configure language="auto", disable subtitle generation
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [x] 7.2 Implement transcription and error handling
    - Implement transcribe method accepting audio file path
    - Concatenate segment.speech values with spaces
    - Throw error if audio file not found
    - Log and re-throw whisper.cpp errors
    - Register IPC handler 'transcription:transcribe'
    - _Requirements: 4.4, 4.7, 4.8, 4.9, 4.10_

  - [ ]* 7.3 Write property tests for Whisper Service
    - **Property 13: Whisper Transcription Invocation**
    - **Property 14: Whisper Segment Concatenation**
    - **Property 15: Whisper Error Propagation**
    - **Validates: Requirements 4.4, 4.7, 4.9**

- [ ] 8. Provider Manager Implementation
  - [ ] 8.1 Implement ProviderManager class
    - Maintain list of configured providers
    - Include built-in "local" provider (http://127.0.0.1:8000/v1)
    - Support provider types: local, openai, anthropic, azure-openai
    - Create OpenAI-compatible client for local provider
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 8.2 Implement persistence and events
    - Persist configurations to {userData}/providers.json
    - Load configurations on startup
    - Create default file with "local" provider if not exists
    - Emit 'provider-changed' event on active provider change
    - _Requirements: 6.5, 6.6, 6.7, 6.8_

  - [ ]* 8.3 Write property tests for Provider Manager
    - **Property 18: Provider Change Event Emission**
    - **Property 19: Provider Configuration Persistence Round-Trip**
    - **Validates: Requirements 6.5, 6.6**

- [ ] 9. Checkpoint - Verify core services
  - Test MCP client connection to a sample server
  - Test Whisper transcription with a sample audio file
  - Test provider switching
  - Ask the user if questions arise

- [ ] 10. Logging and Error Handling
  - [ ] 10.1 Implement centralized Logger service
    - Create Logger class in main process
    - Log with timestamp, error type, message, stack trace
    - Write to {userData}/logs/goatedapp.log
    - Rotate logs when exceeding 10MB, keep last 5
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

  - [ ] 10.2 Implement PHI redaction and renderer error forwarding
    - Redact message contents that may contain PHI
    - Set up IPC handler for renderer errors
    - Forward renderer errors to main process logger
    - _Requirements: 10.3, 10.8_

  - [ ] 10.3 Implement toast notification system
    - Create toast notification component
    - Display human-readable error messages
    - Include "View Details" button for full error
    - _Requirements: 10.6, 10.7_

  - [ ]* 10.4 Write property tests for logging
    - **Property 30: Error Logging Format**
    - **Property 31: Renderer Error Forwarding**
    - **Property 32: Log File Rotation**
    - **Property 34: PHI Redaction in Logs**
    - **Validates: Requirements 10.2, 10.3, 10.5, 10.8**

- [ ] 11. Design System and Base Components
  - [ ] 11.1 Create design tokens and theme
    - Define color palette (#10A37F primary, #202123 sidebar, etc.)
    - Set up typography (Söhne/Inter fonts, size scale)
    - Configure spacing (8px base) and border radius
    - Create CSS variables or styled-components theme
    - _Requirements: 11.1-11.10_

  - [ ] 11.2 Create base UI components
    - Button component (primary green, secondary styles)
    - Input component with focus ring
    - Toggle switch component
    - Toast notification component
    - _Requirements: 14.5, 14.6, 14.7, 14.8, 14.9_

- [ ] 12. Audio Recording Hook
  - [ ] 12.1 Implement useRecorder React hook
    - Request microphone access via getUserMedia
    - Create MediaRecorder and accumulate chunks
    - Manage isRecording state
    - Combine chunks into WAV blob on stop
    - Convert to ArrayBuffer and send via IPC
    - Handle NotAllowedError and NotFoundError
    - _Requirements: 5.1-5.11_

  - [ ]* 12.2 Write property tests for audio recording
    - **Property 16: Audio Recording State Consistency**
    - **Property 17: Audio Recording Data Flow**
    - **Validates: Requirements 5.5, 5.9, 5.2-5.8**

- [ ] 13. Conversation Interface
  - [ ] 13.1 Implement MessageList component
    - Scrollable message list with white background
    - UserMessage with gray background (#F7F7F8)
    - AssistantMessage with transparent background
    - Display role, content, timestamp for each message
    - ToolCallCard with green accent (#E6F4F1)
    - _Requirements: 8.2, 8.3, 12.2-12.6, 12.13, 12.14_

  - [ ] 13.2 Implement InputArea component
    - Text input with expandable height (max 200px)
    - Send button (circular, green)
    - Microphone button with recording animation
    - Loading indicator (three animated dots)
    - _Requirements: 8.4, 8.5, 12.7-12.12_

  - [ ] 13.3 Implement useChat hook
    - Manage messages array state
    - Send messages to AI provider
    - Handle tool calls via MCP client
    - Send follow-up after tool results
    - Manage loading state
    - _Requirements: 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12_

  - [ ] 13.4 Implement conversation persistence
    - Persist messages to IndexedDB
    - Load most recent conversation on startup
    - Implement "New Conversation" functionality
    - _Requirements: 8.13, 8.14, 8.15_

  - [ ]* 13.5 Write property tests for conversation
    - **Property 22: Message Role Assignment**
    - **Property 23: Conversation Flow to AI**
    - **Property 24: Conversation Loading State**
    - **Property 25: Conversation Persistence Round-Trip**
    - **Validates: Requirements 8.3, 8.6-8.13**

- [ ] 14. Checkpoint - Verify conversation interface
  - Test sending text messages
  - Test voice recording and transcription
  - Test tool call display
  - Ask the user if questions arise

- [ ] 15. Sidebar Navigation
  - [ ] 15.1 Implement Sidebar component
    - Dark background (#202123), 260px width
    - "New Chat" button with green background
    - Conversation list with truncated titles
    - Settings gear icon at bottom
    - Collapsible on screens < 1024px
    - _Requirements: 13.1-13.12_

  - [ ] 15.2 Implement Header component
    - Display conversation title or "New Conversation"
    - GoatedApp logo (stylized "G" in green)
    - Hamburger menu toggle for collapsed sidebar
    - _Requirements: 13.9, 13.10, 13.12_

- [ ] 16. Settings Panel
  - [x] 16.1 Implement SettingsModal component
    - Modal overlay with dark backdrop
    - White background, 16px border radius, max-width 600px
    - Tabbed navigation: General, Models, Providers, About
    - Save/Cancel buttons
    - _Requirements: 14.1-14.4, 14.8, 14.9, 14.10_

  - [ ] 16.2 Implement ModelsTab for model management
    - Display model status (name, size, download status, path)
    - Download button for not-downloaded models
    - Progress bar during download
    - Checksum verification after download
    - Custom model path option
    - _Requirements: 9.1-9.9_

  - [ ]* 16.3 Write property tests for model management
    - **Property 26: Model Info Display Completeness**
    - **Property 27: Model Download Initiation**
    - **Property 28: Model Download Progress**
    - **Property 29: Model Checksum Verification**
    - **Validates: Requirements 9.2-9.7**

  - [ ] 16.4 Implement ProvidersTab
    - List configured providers
    - Add/edit/remove providers
    - Set active provider
    - _Requirements: 6.1-6.8_

- [ ] 17. Final Integration
  - [ ] 17.1 Wire all components together
    - Connect Sidebar to conversation management
    - Connect InputArea to useChat and useRecorder
    - Connect Settings to ProviderManager and model downloads
    - Connect error handling to toast notifications
    - _Requirements: All_

  - [ ] 17.2 Implement app initialization sequence
    - Start Python backend on app launch
    - Load provider configurations
    - Load most recent conversation
    - Check model availability
    - _Requirements: 7.1, 6.7, 8.14, 9.2_

- [ ] 18. Final Checkpoint - Full application testing
  - Test complete conversation flow with local AI
  - Test MCP tool execution
  - Test voice commands end-to-end
  - Test settings persistence
  - Ensure all tests pass
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Python backend tests use pytest + Hypothesis
- TypeScript tests use Vitest + fast-check
