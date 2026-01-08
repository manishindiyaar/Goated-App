# Requirements Document

## Introduction

This feature adds Model Context Protocol (MCP) client capabilities to the GoatedApp, enabling the application to connect to and execute tools from MCP servers. The implementation includes a visually appealing "Connect Tool" button in the top-right corner of the main app that opens a modal for connecting MCP servers by providing their path. When the AI (Gemini 2.5 Pro) generates tool calls, the MCP client will execute them against connected servers and display results with an aesthetic, animated UI.

## Glossary

- **MCP_Client**: The Model Context Protocol client component that manages connections to MCP servers and executes tool calls
- **MCP_Server**: An external process (Python or Node.js script) that exposes tools via the MCP protocol using stdio transport
- **Tool_Connection_Modal**: The modal dialog that allows users to connect to MCP servers by providing the server script path
- **Tool_Execution_UI**: The visual component that displays tool execution status, arguments, and results with animations
- **Server_Path**: The file system path to an MCP server script (.py or .js file)
- **Connected_Server**: An MCP server that has been successfully initialized and is ready to receive tool calls
- **Tool_Registry**: The collection of available tools from all connected MCP servers

## Requirements

### Requirement 1: Connect Tool Button

**User Story:** As a user, I want to see an aesthetic "+" icon button labeled "Connect Tool" in the top-right corner of the main app, so that I can easily access the MCP server connection functionality.

#### Acceptance Criteria

1. THE Main_App SHALL display a "Connect Tool" button with a "+" icon in the top-right corner of the main content area
2. WHEN the user hovers over the Connect Tool button, THE Button SHALL display a subtle hover effect consistent with the Clinical Zen design system
3. WHEN the user clicks the Connect Tool button, THE Tool_Connection_Modal SHALL open
4. THE Connect Tool button SHALL be visually consistent with the existing app aesthetic (soft shadows, rounded corners, muted colors)

### Requirement 2: Tool Connection Modal

**User Story:** As a user, I want a clean modal interface to connect MCP servers by providing the server script path, so that I can easily add new tool capabilities to my assistant.

#### Acceptance Criteria

1. WHEN the Tool_Connection_Modal opens, THE Modal SHALL display a text input field for the server script path
2. THE Tool_Connection_Modal SHALL display a "Connect" button to initiate the connection
3. THE Tool_Connection_Modal SHALL display a "Cancel" button to close without connecting
4. WHEN the user enters a path and clicks Connect, THE MCP_Client SHALL attempt to connect to the specified server
5. WHILE connecting to a server, THE Tool_Connection_Modal SHALL display a loading indicator
6. IF the connection succeeds, THEN THE Tool_Connection_Modal SHALL close and display a success notification
7. IF the connection fails, THEN THE Tool_Connection_Modal SHALL display an error message with details
8. THE Tool_Connection_Modal SHALL validate that the path ends with .py or .js before attempting connection

### Requirement 3: MCP Client Core

**User Story:** As a developer, I want a robust MCP client implementation in the main process, so that the app can reliably connect to and communicate with MCP servers.

#### Acceptance Criteria

1. THE MCP_Client SHALL support stdio transport for connecting to MCP servers
2. WHEN connecting to a .py server, THE MCP_Client SHALL spawn the process using "python" or "python3" command
3. WHEN connecting to a .js server, THE MCP_Client SHALL spawn the process using "node" command
4. WHEN a connection is established, THE MCP_Client SHALL call the server's initialize method
5. WHEN initialization completes, THE MCP_Client SHALL retrieve the list of available tools from the server
6. THE MCP_Client SHALL store connected servers and their tools in the Tool_Registry
7. WHEN a server disconnects unexpectedly, THE MCP_Client SHALL emit an error event and update the Tool_Registry
8. THE MCP_Client SHALL support multiple simultaneous server connections

### Requirement 4: Tool Execution

**User Story:** As a user, I want the AI to be able to execute tools from connected MCP servers, so that I can leverage external capabilities in my conversations.

#### Acceptance Criteria

1. WHEN sending a chat message, THE System SHALL include all available tools from the Tool_Registry in the request to Gemini
2. WHEN Gemini returns a tool_call, THE MCP_Client SHALL execute the tool on the appropriate connected server
3. WHEN a tool execution completes, THE System SHALL send the result back to Gemini for processing
4. IF a tool execution fails, THEN THE System SHALL send the error message back to Gemini
5. THE System SHALL support multiple sequential tool calls in a single conversation turn

### Requirement 5: Tool Execution UI

**User Story:** As a user, I want to see a visually appealing display of tool executions, so that I can understand what actions the AI is taking on my behalf.

#### Acceptance Criteria

1. WHEN a tool is being executed, THE Tool_Execution_UI SHALL display an animated loading state with the tool name
2. WHEN a tool execution completes successfully, THE Tool_Execution_UI SHALL display a success indicator with a smooth transition
3. WHEN a tool execution fails, THE Tool_Execution_UI SHALL display an error indicator with the error message
4. THE Tool_Execution_UI SHALL display the tool arguments in a collapsible, formatted view
5. THE Tool_Execution_UI SHALL display the tool result in a collapsible, formatted view
6. THE Tool_Execution_UI SHALL use animations for state transitions (pending → success/error)
7. THE Tool_Execution_UI SHALL be consistent with the existing ToolCallCard component styling

### Requirement 6: Connected Servers Management

**User Story:** As a user, I want to see and manage my connected MCP servers, so that I can disconnect servers I no longer need.

#### Acceptance Criteria

1. THE Tool_Connection_Modal SHALL display a list of currently connected servers
2. FOR EACH connected server, THE Modal SHALL display the server name and available tool count
3. WHEN the user clicks a disconnect button next to a server, THE MCP_Client SHALL disconnect from that server
4. WHEN a server is disconnected, THE Tool_Registry SHALL be updated to remove its tools
5. WHEN a server is disconnected, THE UI SHALL display a confirmation notification

### Requirement 7: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong with MCP connections or tool executions, so that I can troubleshoot issues.

#### Acceptance Criteria

1. IF the server script path does not exist, THEN THE System SHALL display "Server script not found" error
2. IF the server script is not a .py or .js file, THEN THE System SHALL display "Invalid server script type" error
3. IF the server process fails to start, THEN THE System SHALL display the process error message
4. IF the server initialization times out (30 seconds), THEN THE System SHALL display "Connection timeout" error
5. IF a tool execution times out (60 seconds), THEN THE System SHALL display "Tool execution timeout" error
6. WHEN any error occurs, THE System SHALL log the full error details to the console for debugging

### Requirement 8: IPC Communication

**User Story:** As a developer, I want secure IPC channels for MCP operations, so that the renderer process can safely interact with MCP servers through the main process.

#### Acceptance Criteria

1. THE Preload_Script SHALL expose mcp:connect, mcp:disconnect, mcp:listTools, and mcp:executeTool IPC channels
2. THE Main_Process SHALL handle all MCP operations and never expose raw process spawning to the renderer
3. WHEN mcp:connect is called, THE Main_Process SHALL validate the server path before spawning
4. WHEN mcp:executeTool is called, THE Main_Process SHALL validate the tool exists in the Tool_Registry
5. THE IPC channels SHALL return typed responses matching the defined interfaces
