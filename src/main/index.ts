import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { config } from 'dotenv';
import { getWhisperService, WhisperModel } from './services/WhisperService';
import { getMCPService } from './services/MCPService';
import { getAIService } from './services/AIService';

// Load environment variables from .env file
config();

let mainWindow: BrowserWindow | null = null;

// Backend configuration
const BACKEND_URL = 'http://127.0.0.1:8000';

// Conversation history for context
let conversationHistory: Array<{ role: string; content: string; tool_calls?: unknown[] }> = [];

// Initialize services
const whisperService = getWhisperService();
const mcpService = getMCPService();
const aiService = getAIService();

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

function createWindow(): void {
  // Create the browser window with security settings
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    title: 'GoatedApp',
    webPreferences: {
      // Security: Enable context isolation
      contextIsolation: true,
      // Security: Disable node integration in renderer
      nodeIntegration: false,
      // Security: Disable remote module
      // @ts-ignore - enableRemoteModule may not be in types but is important for security
      enableRemoteModule: false,
      // Load preload script
      preload: path.join(__dirname, '../preload/index.js'),
      // Security: Disable web security only in dev mode
      webSecurity: !isDev,
    },
    // Show window when ready to prevent visual flash
    show: false,
    backgroundColor: '#FFFFFF',
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize WhisperService
  try {
    await whisperService.initialize();
    console.log('[GoatedApp] WhisperService initialized');
  } catch (error) {
    console.error('[GoatedApp] Failed to initialize WhisperService:', error);
  }

  // Initialize AIService with Gemini API key from environment
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    aiService.initialize(geminiApiKey);
    console.log('[GoatedApp] AIService initialized with Gemini');
  } else {
    console.warn('[GoatedApp] GEMINI_API_KEY not found - AI features will use Python backend');
  }

  createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('will-quit', () => {
  // Clean up resources here (e.g., stop Python backend)
  console.log('[GoatedApp] Application is quitting...');
});

// ============================================
// IPC Handlers
// ============================================

// Example IPC handler for getting app info
ipcMain.handle('app:getInfo', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    userDataPath: app.getPath('userData'),
  };
});

// Placeholder for backend status - now checks actual Python backend
ipcMain.handle('backend:status', async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (response.ok) {
      const data = await response.json() as { model_loaded?: boolean };
      return {
        running: true,
        pid: null,
        restartCount: 0,
        healthy: data.model_loaded === true,
      };
    }
    return { running: false, pid: null, restartCount: 0, healthy: false };
  } catch {
    return { running: false, pid: null, restartCount: 0, healthy: false };
  }
});

// Transcription handler - Requirement 4.10: IPC handler at 'transcription:transcribe'
ipcMain.handle('transcription:transcribe', async (_event, audioBuffer: ArrayBuffer) => {
  try {
    const result = await whisperService.transcribeBuffer(audioBuffer);
    return result;
  } catch (error) {
    console.error('[Transcription] Error:', error);
    throw error;
  }
});

// Get available Whisper models
ipcMain.handle('transcription:getModels', () => {
  return whisperService.getAvailableModels();
});

// Set Whisper model
ipcMain.handle('transcription:setModel', async (_event, modelName: string) => {
  try {
    await whisperService.setModel(modelName as WhisperModel);
    return { success: true };
  } catch (error) {
    console.error('[Transcription] Failed to set model:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Get current Whisper model
ipcMain.handle('transcription:getModel', () => {
  return whisperService.getModelName();
});

// Chat handler - uses AIService with MCP tools or falls back to Python backend
ipcMain.handle('chat:send', async (_event, message: string) => {
  try {
    // If AIService is initialized, use Vercel AI SDK
    if (aiService.isInitialized()) {
      console.log('[Chat] Using AIService with Vercel AI SDK');
      const result = await aiService.chat(message);
      return {
        response: result.response,
        toolCalls: result.toolCalls?.map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
          result: tc.result,
          status: tc.status,
        })),
      };
    }

    // Fall back to Python backend
    console.log('[Chat] Using Python backend');
    
    // Add user message to history
    conversationHistory.push({ role: 'user', content: message });

    // Get MCP tools for the request
    const mcpTools = mcpService.getToolsForGemini();

    // Prepare request to Python backend
    const requestBody = {
      messages: conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls,
      })),
      model: 'gemini-2.5-flash',
      temperature: 0.0,
      tools: mcpTools.length > 0 ? mcpTools : undefined,
    };

    // Call the Python backend
    const response = await fetch(`${BACKEND_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' })) as { detail?: string };
      throw new Error(errorData.detail || `Backend error: ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
        finish_reason?: string;
      }>;
    };
    
    // Extract the assistant's response
    const assistantMessage = data.choices?.[0]?.message;
    const finishReason = data.choices?.[0]?.finish_reason;
    
    if (!assistantMessage) {
      throw new Error('Invalid response from backend');
    }

    // Handle tool calls if present
    let toolCallResults: Array<{ id: string; name: string; arguments: string; result?: string; status: string }> = [];
    let finalResponse = assistantMessage.content || '';
    
    if (finishReason === 'tool_calls' && assistantMessage.tool_calls) {
      // Execute each tool call via MCP
      const toolResults: string[] = [];
      
      for (const tc of assistantMessage.tool_calls) {
        const toolArgs = JSON.parse(tc.function.arguments);
        const result = await mcpService.executeTool(tc.function.name, toolArgs);
        
        // Get the result as a string
        const resultStr = result.success 
          ? (typeof result.result === 'string' ? result.result : JSON.stringify(result.result))
          : (result.error || 'Tool execution failed');
        
        toolCallResults.push({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.stringify(toolArgs, null, 2),
          result: resultStr,
          status: result.success ? 'success' : 'error',
        });
        
        if (result.success) {
          toolResults.push(`${tc.function.name}: ${resultStr}`);
        }
      }
      
      // If we have tool results but no text response, create a summary
      if (!finalResponse && toolResults.length > 0) {
        finalResponse = toolResults.join('\n');
      }

      // Add assistant message with tool calls to history
      conversationHistory.push({
        role: 'assistant',
        content: finalResponse,
        tool_calls: assistantMessage.tool_calls,
      });
    } else {
      // No tool calls, just add the response
      conversationHistory.push({
        role: 'assistant',
        content: finalResponse,
      });
    }

    // Return response in expected format
    return {
      response: finalResponse,
      toolCalls: toolCallResults.length > 0 ? toolCallResults : undefined,
    };
  } catch (error) {
    console.error('[Chat] Error:', error);
    // Remove the failed user message from history if using Python backend
    if (!aiService.isInitialized() && conversationHistory.length > 0) {
      conversationHistory.pop();
    }
    throw error;
  }
});

// Clear conversation history
ipcMain.handle('chat:clear', () => {
  conversationHistory = [];
  aiService.clearHistory();
  return { success: true };
});

// Streaming chat handler
ipcMain.handle('chat:startStream', async (_event, message: string, streamId: string) => {
  try {
    if (!aiService.isInitialized()) {
      mainWindow?.webContents.send(`chat:stream:${streamId}`, {
        type: 'error',
        data: 'AI Service not initialized. Please set GEMINI_API_KEY.',
      });
      return;
    }

    console.log('[Chat] Starting stream with Vercel AI SDK');
    
    await aiService.chatStream(message, {
      onTextChunk: (chunk: string) => {
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
      onToolResult: (toolCallId: string, result: string, status: 'success' | 'error') => {
        mainWindow?.webContents.send(`chat:stream:${streamId}`, {
          type: 'tool-result',
          data: { toolCallId, result, status },
        });
      },
      onComplete: (fullText: string) => {
        mainWindow?.webContents.send(`chat:stream:${streamId}`, {
          type: 'complete',
          data: fullText,
        });
      },
      onError: (error: Error) => {
        mainWindow?.webContents.send(`chat:stream:${streamId}`, {
          type: 'error',
          data: error.message,
        });
      },
    });
  } catch (error) {
    console.error('[Chat] Stream error:', error);
    mainWindow?.webContents.send(`chat:stream:${streamId}`, {
      type: 'error',
      data: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Placeholder for provider operations
ipcMain.handle('provider:list', () => {
  return [
    {
      id: 'local',
      name: 'Local (FunctionGemma)',
      type: 'local',
      baseURL: 'http://127.0.0.1:8000/v1',
      isDefault: true,
    },
  ];
});

ipcMain.handle('provider:getActive', () => {
  return {
    id: 'local',
    name: 'Local (FunctionGemma)',
    type: 'local',
    baseURL: 'http://127.0.0.1:8000/v1',
    isDefault: true,
  };
});

ipcMain.handle('provider:setActive', async (_event, _providerId: string) => {
  // Will be implemented in Provider Manager task
  return { success: true };
});

// ============================================
// MCP Operations - Model Context Protocol
// ============================================

// Connect to an MCP server by script path
ipcMain.handle('mcp:connect', async (_event, scriptPath: string) => {
  console.log('[MCP] Connect request for:', scriptPath);
  try {
    const result = await mcpService.connect(scriptPath);
    if (result.success && result.server) {
      return {
        success: true,
        server: {
          id: result.server.id,
          name: result.server.name,
          scriptPath: result.server.scriptPath,
          status: result.server.status,
          toolCount: result.server.tools.length,
          tools: result.server.tools.map(t => ({
            name: t.name,
            description: t.description,
          })),
        },
      };
    }
    return { success: false, error: result.error };
  } catch (error) {
    console.error('[MCP] Connect error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

// Disconnect from an MCP server
ipcMain.handle('mcp:disconnect', async (_event, serverId: string) => {
  console.log('[MCP] Disconnect request for:', serverId);
  try {
    const result = await mcpService.disconnect(serverId);
    return result;
  } catch (error) {
    console.error('[MCP] Disconnect error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

// List all connected MCP servers
ipcMain.handle('mcp:listServers', () => {
  const servers = mcpService.getConnectedServers();
  return servers.map(s => ({
    id: s.id,
    name: s.name,
    scriptPath: s.scriptPath,
    status: s.status,
    toolCount: s.tools.length,
    tools: s.tools.map(t => ({
      name: t.name,
      description: t.description,
    })),
    connectedAt: s.connectedAt,
  }));
});

// List all available tools from connected servers
ipcMain.handle('mcp:listTools', () => {
  return mcpService.getAllTools();
});

// Execute a tool on a connected MCP server
ipcMain.handle('mcp:executeTool', async (_event, toolName: string, args: Record<string, unknown>) => {
  console.log('[MCP] Execute tool:', toolName, args);
  try {
    const result = await mcpService.executeTool(toolName, args);
    return result;
  } catch (error) {
    console.error('[MCP] Execute tool error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

// Placeholder for model operations
ipcMain.handle('model:list', () => {
  return [
    {
      id: 'functiongemma',
      name: 'FunctionGemma 270M',
      type: 'llm',
      size: 270000000,
      status: 'not_downloaded',
    },
    {
      id: 'whisper-base',
      name: 'Whisper Base English',
      type: 'whisper',
      size: 142000000,
      status: 'not_downloaded',
    },
  ];
});

ipcMain.handle('model:download', async (_event, _modelId: string) => {
  // Will be implemented in Model Manager task
  return { success: false, error: 'Model download not yet implemented' };
});

ipcMain.handle('model:getDownloadProgress', async (_event, _modelId: string) => {
  return { modelId: _modelId, bytesDownloaded: 0, totalBytes: 0, percentage: 0 };
});

console.log('[GoatedApp] Main process initialized');
