# MCP Client & AI Integration Guide

This guide explains how GoatedApp integrates with MCP (Model Context Protocol) servers and uses the Vercel AI SDK for AI-powered chat with tool execution. Written for junior engineers to understand the architecture, data flow, and implementation details.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [MCP (Model Context Protocol)](#mcp-model-context-protocol)
4. [Vercel AI SDK Integration](#vercel-ai-sdk-integration)
5. [Streaming Implementation](#streaming-implementation)
6. [UI Components](#ui-components)
7. [Data Flow](#data-flow)
8. [Testing with Mock MCP Server](#testing-with-mock-mcp-server)
9. [Troubleshooting](#troubleshooting)

---

## Overview

GoatedApp is an Electron-based AI chat application that can:
- Connect to external MCP servers to gain new capabilities (tools)
- Use Google's Gemini AI model for intelligent responses
- Execute tools automatically when the AI decides they're needed
- Stream responses in real-time (like ChatGPT/Claude)
- Render markdown with proper formatting

### Key Technologies

| Technology | Purpose |
|------------|---------|
| Electron | Desktop app framework |
| Vercel AI SDK | AI model integration & streaming |
| MCP SDK | Tool server protocol |
| React | UI framework |
| RxDB | Local database for chat persistence |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RENDERER PROCESS                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   App.tsx   │  │  Message.tsx │  │  ToolConnectionModal   │  │
│  │  (Main UI)  │  │  (Chat UI)   │  │  (Connect MCP servers) │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘  │
│         │                                                        │
│         │ window.api.chat.startStream()                         │
│         │ window.api.mcp.connect()                              │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PRELOAD SCRIPT                            ││
│  │  Exposes secure IPC bridge via contextBridge                 ││
│  └──────────────────────────┬──────────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────────┘
                              │ IPC (Inter-Process Communication)
┌─────────────────────────────┼───────────────────────────────────┐
│                         MAIN PROCESS                             │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      IPC Handlers                            ││
│  │  chat:startStream, mcp:connect, mcp:executeTool, etc.       ││
│  └──────────────────────────┬──────────────────────────────────┘│
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │  AIService  │      │ MCPService  │      │   Others    │     │
│  │  (Gemini)   │◄────►│  (Tools)    │      │             │     │
│  └─────────────┘      └──────┬──────┘      └─────────────┘     │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ stdio (stdin/stdout)
                               ▼
                    ┌─────────────────────┐
                    │   MCP Server        │
                    │  (Python/Node.js)   │
                    │                     │
                    │  Tools:             │
                    │  - get_current_time │
                    │  - calculate        │
                    │  - custom tools...  │
                    └─────────────────────┘
```

---

## MCP (Model Context Protocol)

### What is MCP?

MCP is a protocol that allows AI applications to connect to external "tool servers". These servers provide capabilities (tools) that the AI can use. For example:
- A weather server might provide a `get_weather` tool
- A database server might provide `query_database` tool
- A file system server might provide `read_file`, `write_file` tools

### How MCP Works

1. **Connection**: The app spawns the MCP server as a child process
2. **Handshake**: Client and server exchange capabilities
3. **Tool Discovery**: Server tells client what tools are available
4. **Tool Execution**: When AI needs a tool, client sends request to server
5. **Results**: Server executes tool and returns results

### MCPService Implementation

**File: `src/main/services/MCPService.ts`**

```typescript
// Key concepts in MCPService:

// 1. Server Connection
async connect(scriptPath: string): Promise<MCPConnectResult> {
  // Validate the script exists
  // Determine if it's Python (.py) or Node.js (.js)
  // Spawn the process with stdio transport
  // Initialize MCP client
  // Discover available tools
}

// 2. Tool Registry
// MCPService maintains a registry of all tools from all connected servers
private toolRegistry: Map<string, { tool: MCPTool; serverId: string }>;

// 3. Tool Execution
async executeTool(toolName: string, args: Record<string, unknown>) {
  // Find which server has this tool
  // Send execution request via MCP protocol
  // Return results
}
```

### Key MCPService Methods

| Method | Purpose |
|--------|---------|
| `connect(scriptPath)` | Connect to an MCP server |
| `disconnect(serverId)` | Disconnect from a server |
| `getAllTools()` | Get all available tools |
| `executeTool(name, args)` | Execute a specific tool |
| `getConnectedServers()` | List connected servers |

### MCP Tool Format

When an MCP server provides tools, they look like this:

```typescript
interface MCPTool {
  name: string;           // e.g., "get_current_time"
  description: string;    // e.g., "Get the current time"
  inputSchema: {          // JSON Schema for arguments
    type: "object",
    properties: {
      timezone: { type: "string", description: "Timezone name" }
    },
    required: ["timezone"]
  };
}
```

---

## Vercel AI SDK Integration

### What is Vercel AI SDK?

The Vercel AI SDK is a library that makes it easy to:
- Connect to various AI models (OpenAI, Anthropic, Google, etc.)
- Stream responses in real-time
- Handle tool/function calling
- Manage conversation history

### Why Vercel AI SDK?

1. **Unified API**: Same code works with different AI providers
2. **Built-in Streaming**: Real-time text streaming out of the box
3. **Tool Support**: Automatic tool execution with `stopWhen: stepCountIs(n)`
4. **Type Safety**: Full TypeScript support

### AIService Implementation

**File: `src/main/services/AIService.ts`**

```typescript
// Key imports
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, stepCountIs } from 'ai';
import { tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';

// Initialize with API key
initialize(apiKey: string): void {
  this.google = createGoogleGenerativeAI({ apiKey });
}

// Non-streaming chat
async chat(userMessage: string): Promise<ChatResult> {
  const result = await generateText({
    model: this.google('gemini-2.5-pro-preview-06-05'),
    messages: this.conversationHistory,
    tools: this.convertMCPToolsToAITools(mcpTools),
    stopWhen: stepCountIs(5), // Allow up to 5 tool execution steps
  });
  return { response: result.text, toolCalls };
}

// Streaming chat
async chatStream(userMessage: string, callbacks: StreamCallbacks): Promise<void> {
  const result = streamText({
    model: this.google('gemini-2.5-pro-preview-06-05'),
    messages: this.conversationHistory,
    tools: this.convertMCPToolsToAITools(mcpTools),
    stopWhen: stepCountIs(5),
  });
  
  // Process stream chunks
  for await (const chunk of result.textStream) {
    callbacks.onTextChunk(chunk);
  }
  callbacks.onComplete(fullText);
}
```

### Converting MCP Tools to AI SDK Format

The AI SDK expects tools in a specific format. We convert MCP tools:

```typescript
private convertMCPToolsToAITools(mcpTools: MCPTool[]): Record<string, any> {
  const tools: Record<string, any> = {};
  
  for (const mcpTool of mcpTools) {
    tools[mcpTool.name] = tool({
      description: mcpTool.description,
      // Convert JSON Schema to Zod schema
      inputSchema: z.object(this.convertJsonSchemaToZod(mcpTool.inputSchema)),
      // Execute function - called when AI uses this tool
      execute: async (args) => {
        const result = await mcpService.executeTool(mcpTool.name, args);
        return result.result;
      },
    });
  }
  
  return tools;
}
```

### Understanding `stopWhen: stepCountIs(5)`

This is crucial for tool execution. Here's what happens:

1. AI receives user message
2. AI decides to call a tool (step 1)
3. Tool executes, result returned to AI
4. AI might call another tool (step 2)
5. ...continues until AI gives final response or hits step limit

Without `stopWhen`, the AI would stop after the first tool call without giving a final response.

---

## Streaming Implementation

### Why Streaming?

Without streaming:
- User sends message
- Waits 5-10 seconds
- Entire response appears at once

With streaming:
- User sends message
- Text appears word-by-word in real-time
- Much better user experience (like ChatGPT/Claude)

### Streaming Architecture

```
┌─────────────┐     IPC Events      ┌─────────────┐
│   App.tsx   │◄───────────────────│  AIService  │
│  (Renderer) │  chat:stream:xyz   │   (Main)    │
└─────────────┘                     └─────────────┘
      │                                    │
      │ Updates state:                     │ Emits events:
      │ - streamingContent                 │ - onTextChunk
      │ - streamingToolCalls               │ - onToolCall
      │                                    │ - onToolResult
      ▼                                    │ - onComplete
┌─────────────┐                            │
│ Message.tsx │                            │
│ (Shows text │◄───────────────────────────┘
│  + cursor)  │
└─────────────┘
```

### Stream Event Types

```typescript
type StreamEventType = 'text' | 'tool-call' | 'tool-result' | 'complete' | 'error';

interface StreamEvent {
  type: StreamEventType;
  data: string | StreamToolCall | ToolResult;
}
```

| Event Type | When Fired | Data |
|------------|------------|------|
| `text` | Each text chunk arrives | The text chunk string |
| `tool-call` | AI decides to use a tool | Tool name, arguments |
| `tool-result` | Tool execution completes | Tool ID, result, status |
| `complete` | Stream finished | Full response text |
| `error` | Something went wrong | Error message |

### Preload Script (IPC Bridge)

**File: `src/preload/index.ts`**

```typescript
chat: {
  // Start streaming - sets up event listener and invokes handler
  startStream: (message: string, onEvent: (event: StreamEvent) => void): void => {
    const streamId = `stream_${Date.now()}`;
    
    // Listen for events from main process
    const handler = (_event: unknown, data: StreamEvent) => {
      onEvent(data);
      // Clean up when done
      if (data.type === 'complete' || data.type === 'error') {
        ipcRenderer.removeListener(`chat:stream:${streamId}`, handler);
      }
    };
    
    ipcRenderer.on(`chat:stream:${streamId}`, handler);
    ipcRenderer.invoke('chat:startStream', message, streamId);
  },
}
```

### Main Process Handler

**File: `src/main/index.ts`**

```typescript
ipcMain.handle('chat:startStream', async (_event, message: string, streamId: string) => {
  await aiService.chatStream(message, {
    onTextChunk: (chunk: string) => {
      // Send chunk to renderer
      mainWindow?.webContents.send(`chat:stream:${streamId}`, {
        type: 'text',
        data: chunk,
      });
    },
    onToolCall: (toolCall) => {
      mainWindow?.webContents.send(`chat:stream:${streamId}`, {
        type: 'tool-call',
        data: toolCall,
      });
    },
    onComplete: (fullText: string) => {
      mainWindow?.webContents.send(`chat:stream:${streamId}`, {
        type: 'complete',
        data: fullText,
      });
    },
    // ... other callbacks
  });
});
```

### React State Management for Streaming

**File: `src/renderer/App.tsx`**

```typescript
// Streaming state
const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
const [streamingContent, setStreamingContent] = useState<string>('');
const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCall[]>([]);

// Handle stream events
const handleStreamEvent = useCallback((event: StreamEvent) => {
  switch (event.type) {
    case 'text':
      // Append new text to existing content
      setStreamingContent(prev => prev + (event.data as string));
      break;
    case 'tool-call':
      // Add new tool call to list
      setStreamingToolCalls(prev => [...prev, event.data as StreamToolCall]);
      break;
    case 'tool-result':
      // Update existing tool call with result
      setStreamingToolCalls(prev => prev.map(tc => 
        tc.id === result.toolCallId 
          ? { ...tc, result: result.result, status: result.status }
          : tc
      ));
      break;
    // ...
  }
}, []);

// Messages include streaming message
const messages = [
  ...dbMessages,
  // Add streaming message if active
  ...(streamingMessageId ? [{
    id: streamingMessageId,
    role: 'assistant',
    content: streamingContent,
    toolCalls: streamingToolCalls,
    isStreaming: true,
  }] : []),
];
```

---

## UI Components

### Message Component

**File: `src/renderer/components/Message.tsx`**

Renders chat messages with:
- Role-based styling (user vs assistant)
- Markdown rendering via `react-markdown`
- Tool call cards
- Streaming cursor animation

```typescript
export const Message: React.FC<MessageProps> = ({
  role,
  content,
  toolCalls,
  isStreaming,
}) => {
  return (
    <div className={`message message--${role}`}>
      {role === 'assistant' && <div className="message__avatar">...</div>}
      
      <div className="message__bubble">
        {/* Tool calls rendered first */}
        {toolCalls?.map(tc => <ToolCallCard key={tc.id} toolCall={tc} />)}
        
        {/* Markdown content */}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
        
        {/* Streaming cursor */}
        {isStreaming && <span className="message__cursor">▊</span>}
      </div>
    </div>
  );
};
```

### ToolCallCard Component

**File: `src/renderer/components/ToolCallCard.tsx`**

Displays tool executions in a collapsible card:
- Tool name and status (pending/success/error)
- Arguments (JSON formatted)
- Results (when complete)

### ConnectToolButton & ToolConnectionModal

**Files: `src/renderer/components/ConnectToolButton.tsx`, `ToolConnectionModal.tsx`**

- Button in top-right corner shows connected server count
- Modal allows pasting MCP server script path
- Lists connected servers with disconnect option

---

## Data Flow

### Complete Flow: User Sends Message

```
1. User types message and presses Enter
   └─► App.tsx handleSubmit()

2. Save user message to database
   └─► addMessage('user', content)

3. Initialize streaming state
   └─► setStreamingMessageId(), setStreamingContent('')

4. Start stream via IPC
   └─► window.api.chat.startStream(message, handleStreamEvent)

5. Preload creates unique stream ID, sets up listener
   └─► ipcRenderer.on(`chat:stream:${streamId}`, handler)

6. Main process receives request
   └─► ipcMain.handle('chat:startStream', ...)

7. AIService.chatStream() called
   └─► Sends to Gemini with tools

8. Gemini decides to use a tool
   └─► callbacks.onToolCall() → IPC event → handleStreamEvent()
   └─► UI shows tool card with "Running" status

9. MCPService executes tool
   └─► Sends to MCP server via stdio
   └─► Server returns result

10. Tool result sent back
    └─► callbacks.onToolResult() → IPC event → handleStreamEvent()
    └─► UI updates tool card with result

11. Gemini generates text response
    └─► callbacks.onTextChunk() → IPC event → handleStreamEvent()
    └─► UI shows text appearing character by character

12. Stream completes
    └─► callbacks.onComplete() → IPC event
    └─► Save assistant message to database
    └─► Clear streaming state
```

---

## Testing with Mock MCP Server

### The Test Server

**File: `mcp-test-server.py`**

A simple Python MCP server with 4 tools for testing:

```python
@server.tool()
async def get_current_time(timezone: str = "UTC") -> str:
    """Get the current time in a specified timezone."""
    # Returns current time

@server.tool()
async def calculate(operation: str, a: float, b: float) -> str:
    """Perform basic arithmetic operations."""
    # add, subtract, multiply, divide

@server.tool()
async def echo(message: str) -> str:
    """Echo back the provided message."""
    # Returns the message

@server.tool()
async def generate_random(min_val: int = 0, max_val: int = 100) -> str:
    """Generate a random number."""
    # Returns random number
```

### Running the Test Server

```bash
# Install dependencies
pip install mcp

# The server is started automatically when you connect via the UI
# Just paste the path: /path/to/mcp-test-server.py
```

### Testing Tool Execution

1. Start the app: `npm run dev`
2. Click the "+" button (top-right)
3. Paste the path to `mcp-test-server.py`
4. Click "Connect"
5. You should see "4 tools" connected
6. Try these prompts:
   - "What time is it?"
   - "Calculate 25 + 17"
   - "Generate a random number between 1 and 100"

---

## Troubleshooting

### Common Issues

#### 1. "GEMINI_API_KEY not found"

**Cause**: The `.env` file is missing or incorrectly formatted.

**Solution**:
```bash
# Create .env in project root (not python/.env)
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

Make sure there's no `export` prefix - just `KEY=value`.

#### 2. MCP Server Won't Connect

**Cause**: Python/Node.js not found or script path wrong.

**Solution**:
- Check the script path is absolute
- Ensure Python 3 is installed: `python3 --version`
- Check MCP SDK is installed: `pip install mcp`

#### 3. Tools Not Appearing in AI Responses

**Cause**: AI might not be using tools, or tool results aren't being returned.

**Solution**:
- Check console logs for `[AIService] Executing tool:`
- Verify MCP server is returning results (check `[MCPService] Tool result:`)
- Make sure `stopWhen: stepCountIs(5)` is set

#### 4. Streaming Not Working

**Cause**: IPC events not being received.

**Solution**:
- Check that `chat:startStream` handler exists in main process
- Verify preload script exposes `chat.startStream`
- Check browser console for errors

### Debug Logging

Key log prefixes to watch:
- `[AIService]` - AI model interactions
- `[MCPService]` - MCP server connections and tool execution
- `[Chat]` - IPC chat handlers
- `[MCP]` - IPC MCP handlers

---

## Summary

### Key Files Reference

| File | Purpose |
|------|---------|
| `src/main/services/AIService.ts` | Vercel AI SDK integration, Gemini chat |
| `src/main/services/MCPService.ts` | MCP server connections, tool registry |
| `src/main/index.ts` | IPC handlers, app initialization |
| `src/preload/index.ts` | Secure IPC bridge |
| `src/renderer/App.tsx` | Main UI, streaming state management |
| `src/renderer/components/Message.tsx` | Chat message rendering |
| `src/renderer/components/ToolCallCard.tsx` | Tool execution display |
| `mcp-test-server.py` | Test MCP server |

### Key Concepts

1. **MCP Protocol**: Standardized way for AI apps to use external tools
2. **Vercel AI SDK**: Unified API for AI models with streaming support
3. **IPC Communication**: Electron's way of communicating between processes
4. **Streaming**: Real-time text delivery for better UX
5. **Tool Execution**: AI can automatically use tools when needed

### Next Steps for Learning

1. Try adding a new tool to `mcp-test-server.py`
2. Create your own MCP server for a specific use case
3. Experiment with different Gemini models
4. Add error handling for edge cases
5. Implement tool approval (ask user before executing)
