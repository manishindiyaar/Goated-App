/**
 * MCPService - Model Context Protocol Client Service
 * 
 * Manages connections to MCP servers via stdio transport using Vercel AI SDK.
 * Provides tool discovery and execution capabilities for the chat system.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverId: string;
}

export interface MCPServerConnection {
  id: string;
  name: string;
  scriptPath: string;
  client: Client;
  transport: StdioClientTransport;
  process: ChildProcess;
  tools: MCPTool[];
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  connectedAt?: number;
}

export interface ConnectResult {
  success: boolean;
  server?: MCPServerConnection;
  error?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// Timeouts
const CONNECTION_TIMEOUT = 30000; // 30 seconds
const EXECUTION_TIMEOUT = 60000; // 60 seconds

/**
 * MCPService singleton class for managing MCP server connections
 */
class MCPService {
  private servers: Map<string, MCPServerConnection> = new Map();
  private static instance: MCPService;

  private constructor() {}

  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  /**
   * Validate that the script path is a valid .py or .js file
   */
  validatePath(scriptPath: string): { valid: boolean; error?: string } {
    // Check extension
    const ext = path.extname(scriptPath).toLowerCase();
    if (ext !== '.py' && ext !== '.js') {
      return { 
        valid: false, 
        error: 'Invalid server script type. Must be .py or .js file' 
      };
    }

    // Check if file exists
    if (!fs.existsSync(scriptPath)) {
      return { 
        valid: false, 
        error: `Server script not found: ${scriptPath}` 
      };
    }

    return { valid: true };
  }

  /**
   * Get the command to run based on file extension
   */
  getCommand(scriptPath: string): string {
    const ext = path.extname(scriptPath).toLowerCase();
    if (ext === '.py') {
      // Use python3 on Unix, python on Windows
      return process.platform === 'win32' ? 'python' : 'python3';
    }
    return 'node';
  }

  /**
   * Connect to an MCP server by script path
   */
  async connect(scriptPath: string): Promise<ConnectResult> {
    // Validate path
    const validation = this.validatePath(scriptPath);
    if (!validation.valid) {
      console.error(`[MCPService] Path validation failed: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    const serverId = uuidv4();
    const serverName = path.basename(scriptPath, path.extname(scriptPath));
    const command = this.getCommand(scriptPath);

    console.log(`[MCPService] Connecting to server: ${scriptPath}`);
    console.log(`[MCPService] Using command: ${command}`);

    try {
      // Create the transport with stdio
      const transport = new StdioClientTransport({
        command,
        args: [scriptPath],
      });

      // Create MCP client
      const client = new Client(
        { name: 'goated-app', version: '1.0.0' },
        { capabilities: {} }
      );

      // Create server connection object
      const serverConnection: MCPServerConnection = {
        id: serverId,
        name: serverName,
        scriptPath,
        client,
        transport,
        process: null as unknown as ChildProcess,
        tools: [],
        status: 'connecting',
      };

      this.servers.set(serverId, serverConnection);

      // Connect with timeout
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), CONNECTION_TIMEOUT);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // Get available tools
      const toolsResponse = await client.listTools();
      const tools: MCPTool[] = (toolsResponse.tools || []).map(tool => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema as Record<string, unknown>,
        serverId,
      }));

      // Update server connection
      serverConnection.tools = tools;
      serverConnection.status = 'connected';
      serverConnection.connectedAt = Date.now();

      console.log(`[MCPService] Connected to ${serverName} with ${tools.length} tools:`, 
        tools.map(t => t.name));

      return { success: true, server: serverConnection };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MCPService] Connection failed: ${errorMessage}`);
      
      // Clean up failed connection
      const server = this.servers.get(serverId);
      if (server) {
        server.status = 'error';
        server.error = errorMessage;
        try {
          await server.client.close();
        } catch {
          // Ignore cleanup errors
        }
        this.servers.delete(serverId);
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<{ success: boolean; error?: string }> {
    const server = this.servers.get(serverId);
    if (!server) {
      return { success: false, error: 'Server not found' };
    }

    console.log(`[MCPService] Disconnecting from server: ${server.name}`);

    try {
      await server.client.close();
      server.status = 'disconnected';
      this.servers.delete(serverId);
      
      console.log(`[MCPService] Disconnected from ${server.name}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MCPService] Disconnect failed: ${errorMessage}`);
      
      // Force remove from registry anyway
      this.servers.delete(serverId);
      return { success: true }; // Still consider it a success since server is removed
    }
  }

  /**
   * Get all connected servers
   */
  getConnectedServers(): MCPServerConnection[] {
    return Array.from(this.servers.values())
      .filter(s => s.status === 'connected');
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        tools.push(...server.tools);
      }
    }
    return tools;
  }

  /**
   * Execute a tool on the appropriate server
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
    // Find the server that has this tool
    let targetServer: MCPServerConnection | undefined;
    for (const server of this.servers.values()) {
      if (server.status === 'connected' && server.tools.some(t => t.name === toolName)) {
        targetServer = server;
        break;
      }
    }

    if (!targetServer) {
      return { 
        success: false, 
        error: `Tool '${toolName}' not found in any connected server` 
      };
    }

    console.log(`[MCPService] Executing tool ${toolName} on server ${targetServer.name}`);
    console.log(`[MCPService] Tool arguments:`, JSON.stringify(args, null, 2));

    try {
      // Execute with timeout
      const executePromise = targetServer.client.callTool({ name: toolName, arguments: args });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tool execution timeout after 60 seconds')), EXECUTION_TIMEOUT);
      });

      const result = await Promise.race([executePromise, timeoutPromise]);
      
      console.log(`[MCPService] Tool ${toolName} raw result:`, JSON.stringify(result, null, 2));
      
      // Extract text content from MCP result
      // MCP returns { content: [{ type: 'text', text: '...' }] }
      let extractedResult: unknown = result;
      if (result && typeof result === 'object') {
        const mcpResult = result as { content?: Array<{ type: string; text?: string }> };
        if (mcpResult.content && Array.isArray(mcpResult.content)) {
          // Extract text from content array
          const textParts = mcpResult.content
            .filter(c => c.type === 'text' && c.text)
            .map(c => c.text);
          if (textParts.length > 0) {
            extractedResult = textParts.join('\n');
          }
        }
      }
      
      console.log(`[MCPService] Tool ${toolName} extracted result:`, extractedResult);
      return { success: true, result: extractedResult };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MCPService] Tool execution failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get tools formatted for Gemini API (OpenAI-compatible format)
   */
  getToolsForGemini(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.getAllTools().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }
}

// Export singleton instance getter
export function getMCPService(): MCPService {
  return MCPService.getInstance();
}

export default MCPService;
