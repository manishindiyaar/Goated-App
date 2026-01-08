# Requirements Document

## Introduction

GoatedApp is a privacy-first, offline-capable clinical orchestration platform built as a cross-platform Electron application (Mac/Windows). The application implements the Model Context Protocol (MCP) client architecture to serve as a "Universal Adapter" for healthcare workflows. It leverages Edge AI (local Whisper STT + FunctionGemma 270M) to enable clinicians to execute complex workflows across disconnected hospital systems via natural voice commands, with all patient data remaining strictly on-device for HIPAA compliance.

## Glossary

- **GoatedApp**: The Electron-based desktop application being developed
- **Main_Process**: The Electron main process running in Node.js that handles system-level operations, IPC, and spawns child processes
- **Renderer_Process**: The Electron renderer process running the React-based UI in a Chromium context
- **MCP_Client**: Model Context Protocol client implementation that connects to MCP servers for tool execution
- **MCP_Server**: External server implementing the Model Context Protocol that exposes tools for the client to invoke
- **Edge_AI**: Local AI inference running entirely on the user's device without cloud connectivity
- **FunctionGemma_Backend**: Python FastAPI sidecar process running the FunctionGemma 270M model for function calling on port 8000
- **Whisper_Service**: Local speech-to-text service using whisper.cpp bindings (whisper-node) for voice transcription
- **Audio_Recorder**: Frontend React hook that captures microphone input using the Web Audio API
- **Provider_Manager**: Service that manages AI provider configurations including local and remote options
- **IPC_Bridge**: Inter-process communication layer using Electron's ipcMain/ipcRenderer for secure communication between processes
- **Tool_Registry**: MCP component that maintains available tools, their JSON schemas, and execution handlers
- **GGUF_Model**: Quantized model format used by llama.cpp for efficient local inference
- **Context_Window**: The maximum number of tokens (8192) the FunctionGemma model can process in a single request

## Requirements

### Requirement 1: Electron Application Shell

**User Story:** As a clinician, I want to install and run GoatedApp on my Mac or Windows computer, so that I can access the clinical orchestration platform from my workstation.

#### Acceptance Criteria

1. THE GoatedApp SHALL be packaged as a native desktop application using Electron framework version 28 or higher
2. THE GoatedApp SHALL support macOS (Intel and Apple Silicon) and Windows (x64) platforms
3. WHEN the application starts, THE Main_Process SHALL create a BrowserWindow with dimensions of at least 1200x800 pixels
4. THE Main_Process SHALL implement context isolation and disable node integration in the Renderer_Process for security
5. THE GoatedApp SHALL expose a preload script that defines a secure `window.api` object for IPC communication
6. WHEN the Renderer_Process calls `window.api` methods, THE IPC_Bridge SHALL validate and forward requests to the Main_Process
7. WHEN the application window is closed, THE Main_Process SHALL emit a 'will-quit' event before terminating
8. THE GoatedApp SHALL store user data in the platform-specific application data directory (app.getPath('userData'))

### Requirement 2: MCP Client Implementation

**User Story:** As a developer, I want GoatedApp to implement the MCP client protocol, so that it can connect to and utilize MCP servers for tool execution.

#### Acceptance Criteria

1. THE MCP_Client SHALL implement the Model Context Protocol client specification using the official @modelcontextprotocol/sdk TypeScript package
2. THE MCP_Client SHALL support connecting to MCP servers via stdio transport (spawning server processes)
3. THE MCP_Client SHALL support connecting to MCP servers via SSE (Server-Sent Events) transport for HTTP-based servers
4. WHEN initializing a connection, THE MCP_Client SHALL perform the MCP handshake by sending an 'initialize' request with client capabilities
5. WHEN the handshake completes, THE MCP_Client SHALL call 'notifications/initialized' to signal readiness
6. THE MCP_Client SHALL call 'tools/list' to discover available tools from connected MCP servers
7. WHEN a tool is discovered, THE MCP_Client SHALL store its name, description, and JSON schema in the Tool_Registry
8. WHEN invoking a tool, THE MCP_Client SHALL send a 'tools/call' request with the tool name and arguments object
9. WHEN a tool response is received, THE MCP_Client SHALL parse the content array and extract text or other result types
10. IF an MCP server returns an error response, THEN THE MCP_Client SHALL propagate the error message to the caller
11. IF an MCP server connection is lost, THEN THE MCP_Client SHALL emit a 'disconnected' event and attempt reconnection with exponential backoff (1s, 2s, 4s, max 30s)
12. THE MCP_Client SHALL serialize tool arguments to JSON before sending and deserialize responses from JSON

### Requirement 3: FunctionGemma Python Backend

**User Story:** As a clinician, I want the AI to run locally on my device, so that patient data never leaves my computer and responses are fast.

#### Acceptance Criteria

1. THE FunctionGemma_Backend SHALL be implemented as a Python FastAPI application
2. THE FunctionGemma_Backend SHALL listen on http://127.0.0.1:8000 (localhost only, not exposed to network)
3. THE FunctionGemma_Backend SHALL expose a POST endpoint at `/v1/chat/completions` matching the OpenAI API schema
4. THE FunctionGemma_Backend SHALL accept a request body containing: messages (array of {role, content}), tools (optional array of tool definitions), and tool_choice (optional)
5. THE FunctionGemma_Backend SHALL load the FunctionGemma GGUF model from the path specified in MODEL_PATH environment variable
6. THE FunctionGemma_Backend SHALL initialize the model with n_ctx=8192 to support tool definitions in the context
7. THE FunctionGemma_Backend SHALL set temperature=0.0 for deterministic function calling responses
8. WHEN tools are provided in the request, THE FunctionGemma_Backend SHALL set tool_choice="auto" to enable automatic tool selection
9. WHEN the model generates a tool call, THE FunctionGemma_Backend SHALL return a response with choices[0].message.tool_calls array
10. IF the GGUF model file is not found at MODEL_PATH, THEN THE FunctionGemma_Backend SHALL return HTTP 500 with error detail "Model not loaded"
11. IF the model inference fails, THEN THE FunctionGemma_Backend SHALL return HTTP 500 with the exception message
12. THE FunctionGemma_Backend SHALL log all requests and responses for debugging (without logging PHI in production)

### Requirement 4: Whisper Speech-to-Text Service

**User Story:** As a clinician, I want to speak voice commands to the application, so that I can interact hands-free while caring for patients.

#### Acceptance Criteria

1. THE Whisper_Service SHALL be implemented as a TypeScript class in the Main_Process using the whisper-node package
2. THE Whisper_Service SHALL store Whisper models in the directory: `{userData}/models/whisper/`
3. THE Whisper_Service SHALL support the following model sizes: "base.en" (default), "small.en", "medium.en", and "distil-large-v3"
4. WHEN the transcribe method is called with an audio file path, THE Whisper_Service SHALL invoke whisper.cpp with the specified model
5. THE Whisper_Service SHALL configure whisper with language="auto" for automatic language detection
6. THE Whisper_Service SHALL disable generation of subtitle files (gen_file_txt=false, gen_file_subtitle=false, gen_file_vtt=false)
7. WHEN transcription completes, THE Whisper_Service SHALL concatenate all segment.speech values with spaces and return the trimmed result
8. IF the audio file does not exist, THEN THE Whisper_Service SHALL throw an error with message "Audio file not found: {path}"
9. IF whisper.cpp fails during transcription, THEN THE Whisper_Service SHALL log the error and re-throw with context
10. THE Whisper_Service SHALL expose an IPC handler at channel 'transcription:transcribe' that accepts an audio file path

### Requirement 5: Audio Recording

**User Story:** As a clinician, I want to record my voice commands directly in the application, so that I can issue instructions naturally.

#### Acceptance Criteria

1. THE Audio_Recorder SHALL be implemented as a React hook named `useRecorder` in the Renderer_Process
2. WHEN startRecording is called, THE Audio_Recorder SHALL request microphone access via navigator.mediaDevices.getUserMedia({ audio: true })
3. WHEN microphone access is granted, THE Audio_Recorder SHALL create a MediaRecorder instance with the audio stream
4. THE Audio_Recorder SHALL store audio chunks in a ref array via the ondataavailable callback
5. WHILE recording is active, THE Audio_Recorder SHALL set isRecording state to true
6. WHEN stopRecording is called, THE Audio_Recorder SHALL call mediaRecorder.stop() and wait for the onstop event
7. WHEN recording stops, THE Audio_Recorder SHALL combine chunks into a Blob with type 'audio/wav'
8. WHEN the audio Blob is created, THE Audio_Recorder SHALL convert it to ArrayBuffer and send via window.api.transcription.transcribe()
9. WHEN transcription completes, THE Audio_Recorder SHALL return the transcribed text string and set isRecording to false
10. IF navigator.mediaDevices.getUserMedia throws NotAllowedError, THEN THE Audio_Recorder SHALL throw an error with message "Microphone access denied"
11. IF navigator.mediaDevices.getUserMedia throws NotFoundError, THEN THE Audio_Recorder SHALL throw an error with message "No microphone found"

### Requirement 6: Provider Configuration

**User Story:** As a user, I want to configure different AI providers including local inference, so that I can choose between privacy-first local processing or cloud providers.

#### Acceptance Criteria

1. THE Provider_Manager SHALL maintain a list of configured providers with properties: id, name, provider type, baseURL, and apiKey (optional)
2. THE Provider_Manager SHALL include a built-in "local" provider with baseURL="http://127.0.0.1:8000/v1" and no apiKey required
3. WHEN creating a client for the "local" provider, THE Provider_Manager SHALL use the @ai-sdk/openai package with apiKey="not-needed"
4. THE Provider_Manager SHALL support additional provider types: "openai", "anthropic", "azure-openai"
5. WHEN the active provider is changed, THE Provider_Manager SHALL emit a 'provider-changed' event with the new provider id
6. THE Provider_Manager SHALL persist provider configurations to a JSON file at `{userData}/providers.json`
7. WHEN the application starts, THE Provider_Manager SHALL load saved provider configurations from the JSON file
8. IF the providers.json file does not exist, THEN THE Provider_Manager SHALL create it with only the "local" provider configured

### Requirement 7: Process Lifecycle Management

**User Story:** As a user, I want the application to manage its background processes automatically, so that I don't have to manually start or stop services.

#### Acceptance Criteria

1. WHEN GoatedApp's Main_Process starts, THE GoatedApp SHALL spawn the Python FunctionGemma backend using child_process.spawn
2. THE GoatedApp SHALL spawn Python with arguments: ["python/server.py"] from the application's resources directory
3. THE GoatedApp SHALL set environment variable MODEL_PATH pointing to the GGUF model location before spawning
4. THE GoatedApp SHALL capture stdout and stderr from the Python process and log them with prefix "[FunctionGemma]"
5. THE GoatedApp SHALL store the Python process reference and expose a method to check if it is running (pid exists and not killed)
6. THE GoatedApp SHALL implement a health check by sending GET request to http://127.0.0.1:8000/health every 10 seconds
7. IF the health check fails 3 consecutive times, THEN THE GoatedApp SHALL kill the Python process and restart it
8. IF the Python process exits unexpectedly (exit code !== 0), THEN THE GoatedApp SHALL wait 2 seconds and restart it automatically
9. THE GoatedApp SHALL limit automatic restarts to 5 attempts within 60 seconds to prevent restart loops
10. WHEN the Electron app receives 'will-quit' event, THE GoatedApp SHALL send SIGTERM to the Python process and wait up to 5 seconds for graceful shutdown
11. IF the Python process does not exit within 5 seconds, THEN THE GoatedApp SHALL send SIGKILL to force termination
12. THE GoatedApp SHALL expose backend status via IPC channel 'backend:status' returning { running: boolean, pid: number | null, restartCount: number }

### Requirement 8: Conversation Interface

**User Story:** As a clinician, I want a chat interface to interact with the AI assistant, so that I can issue commands and receive responses.

#### Acceptance Criteria

1. THE GoatedApp SHALL render a conversation interface component in the Renderer_Process using React
2. THE conversation interface SHALL display a scrollable message list showing all messages in chronological order
3. EACH message in the list SHALL display: role (user/assistant/tool), content text, and timestamp
4. THE conversation interface SHALL include a text input field at the bottom for typing messages
5. THE conversation interface SHALL include a microphone button that triggers the Audio_Recorder
6. WHEN the user submits a message (Enter key or send button), THE GoatedApp SHALL add it to the message list with role="user"
7. WHEN a user message is submitted, THE GoatedApp SHALL send it to the configured AI provider via the Provider_Manager
8. WHILE waiting for AI response, THE GoatedApp SHALL display a loading indicator in the message list
9. WHEN an AI response is received, THE GoatedApp SHALL add it to the message list with role="assistant"
10. WHEN the AI response contains tool_calls, THE GoatedApp SHALL execute each tool via the MCP_Client
11. WHEN a tool execution completes, THE GoatedApp SHALL add the result to the message list with role="tool" and tool_call_id
12. AFTER tool results are added, THE GoatedApp SHALL send the updated conversation back to the AI for a follow-up response
13. THE GoatedApp SHALL persist conversation history to IndexedDB in the Renderer_Process
14. WHEN the application starts, THE GoatedApp SHALL load the most recent conversation from IndexedDB
15. THE conversation interface SHALL provide a "New Conversation" button that clears the current messages and starts fresh

### Requirement 9: Model Management

**User Story:** As a user, I want to download and manage AI models within the application, so that I can set up the local inference capabilities.

#### Acceptance Criteria

1. THE GoatedApp SHALL provide a settings panel for managing AI models
2. THE settings panel SHALL display the current status of required models: FunctionGemma GGUF and Whisper models
3. FOR each model, THE settings panel SHALL show: name, size, download status (not downloaded/downloading/downloaded), and file path
4. WHEN a model is not downloaded, THE settings panel SHALL display a "Download" button for that model
5. WHEN the Download button is clicked, THE GoatedApp SHALL download the model file to `{userData}/models/` directory
6. WHILE downloading, THE GoatedApp SHALL display a progress bar showing percentage complete
7. WHEN download completes, THE GoatedApp SHALL verify the file integrity using SHA256 checksum
8. IF checksum verification fails, THEN THE GoatedApp SHALL delete the corrupted file and display an error message
9. THE GoatedApp SHALL allow users to specify a custom model path instead of downloading

### Requirement 10: Error Handling and Logging

**User Story:** As a user, I want clear error messages and logging, so that I can understand and troubleshoot issues.

#### Acceptance Criteria

1. THE GoatedApp SHALL implement a centralized error handling service in the Main_Process
2. WHEN an error occurs in the Main_Process, THE error handler SHALL log it with timestamp, error type, message, and stack trace
3. WHEN an error occurs in the Renderer_Process, THE error handler SHALL send it to Main_Process via IPC for logging
4. THE GoatedApp SHALL write logs to a file at `{userData}/logs/goatedapp.log`
5. THE GoatedApp SHALL rotate log files when they exceed 10MB, keeping the last 5 log files
6. WHEN a user-facing error occurs, THE GoatedApp SHALL display a toast notification with a human-readable message
7. THE toast notification SHALL include a "View Details" button that shows the full error in a modal
8. THE GoatedApp SHALL NOT log any Protected Health Information (PHI) - message contents shall be redacted in logs

### Requirement 11: User Interface Design System

**User Story:** As a clinician, I want a clean, modern interface similar to Claude's design, so that I can focus on my work without visual distractions.

#### Acceptance Criteria

1. THE GoatedApp SHALL implement a green color palette as the primary brand color scheme
2. THE primary green color SHALL be #10A37F (emerald green) for primary actions and accents
3. THE secondary green color SHALL be #1A7F64 (darker green) for hover states and secondary elements
4. THE background colors SHALL use a light neutral palette: #FFFFFF (main), #F7F7F8 (secondary), #ECECF1 (borders)
5. THE text colors SHALL be #353740 (primary text), #6E6E80 (secondary text), and #FFFFFF (on primary buttons)
6. THE GoatedApp SHALL use the "Söhne" font family as primary, with "Inter" as fallback, and system sans-serif as final fallback
7. THE font sizes SHALL follow a scale: 13px (small), 15px (body), 18px (heading 3), 24px (heading 2), 32px (heading 1)
8. THE line height SHALL be 1.5 for body text and 1.25 for headings
9. THE GoatedApp SHALL use 8px as the base spacing unit with multiples (8, 16, 24, 32, 48) for consistent spacing
10. THE border radius SHALL be 8px for cards and containers, 6px for buttons, and 4px for small elements

### Requirement 12: Conversation Interface Styling

**User Story:** As a clinician, I want the chat interface to feel familiar and comfortable like Claude, so that I can interact naturally with the AI assistant.

#### Acceptance Criteria

1. THE conversation interface SHALL have a centered content area with maximum width of 768px
2. THE message list SHALL have a clean white background (#FFFFFF) with subtle separation between messages
3. USER messages SHALL be displayed with a light gray background (#F7F7F8) and rounded corners (8px)
4. ASSISTANT messages SHALL be displayed with no background (transparent) to differentiate from user messages
5. THE message text SHALL use 15px font size with #353740 color for optimal readability
6. EACH message SHALL display a subtle timestamp in #6E6E80 color with 13px font size
7. THE text input area SHALL be positioned at the bottom with a white background and subtle top border (#ECECF1)
8. THE text input field SHALL have a light gray background (#F7F7F8), 8px border radius, and expand vertically as text is entered (max 200px)
9. THE send button SHALL be circular with the primary green (#10A37F) background and white arrow icon
10. THE microphone button SHALL be circular with a subtle gray background (#F7F7F8) that turns green (#10A37F) when recording
11. WHILE recording, THE microphone button SHALL display a pulsing animation to indicate active recording
12. THE loading indicator for AI responses SHALL be three animated dots in the primary green color
13. WHEN displaying tool calls, THE interface SHALL show a collapsible card with tool name, status icon, and result preview
14. THE tool call card SHALL have a light green background (#E6F4F1) with a green left border (3px, #10A37F)

### Requirement 13: Navigation and Layout

**User Story:** As a user, I want intuitive navigation to access different features of the application, so that I can efficiently manage conversations and settings.

#### Acceptance Criteria

1. THE GoatedApp SHALL implement a sidebar navigation on the left side with width of 260px
2. THE sidebar SHALL have a dark background (#202123) matching Claude's sidebar aesthetic
3. THE sidebar SHALL display a "New Chat" button at the top with primary green background (#10A37F)
4. THE sidebar SHALL list recent conversations with truncated titles (max 30 characters with ellipsis)
5. EACH conversation item in the sidebar SHALL show the first message preview and relative timestamp
6. WHEN a conversation is selected, THE sidebar item SHALL have a lighter background (#343541) to indicate selection
7. THE sidebar SHALL include a settings gear icon at the bottom that opens the settings panel
8. THE main content area SHALL occupy the remaining width with the conversation interface centered
9. THE header area SHALL display the current conversation title or "New Conversation" with the GoatedApp logo
10. THE GoatedApp logo SHALL be a stylized "G" in the primary green color (#10A37F)
11. THE sidebar SHALL be collapsible on smaller screens (< 1024px width) with a hamburger menu toggle
12. WHEN the sidebar is collapsed, THE toggle button SHALL be visible in the header area

### Requirement 14: Settings Panel Design

**User Story:** As a user, I want a well-organized settings panel, so that I can easily configure the application to my preferences.

#### Acceptance Criteria

1. THE settings panel SHALL open as a modal overlay with a semi-transparent dark backdrop
2. THE settings modal SHALL have a white background with 16px border radius and max-width of 600px
3. THE settings panel SHALL be organized into tabs: "General", "Models", "Providers", and "About"
4. EACH tab SHALL have a clear heading and organized form controls
5. THE form inputs SHALL use the design system colors with green focus rings (#10A37F with 2px outline)
6. THE toggle switches SHALL use green (#10A37F) for the "on" state and gray (#D1D5DB) for "off"
7. THE dropdown selects SHALL have consistent styling with 8px border radius and subtle border (#ECECF1)
8. THE "Save" button SHALL use primary green background (#10A37F) with white text
9. THE "Cancel" button SHALL use transparent background with gray text (#6E6E80)
10. WHEN settings are saved successfully, THE panel SHALL display a green success toast notification
