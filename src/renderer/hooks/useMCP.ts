import { useState, useEffect, useCallback } from 'react';

interface MCPServerInfo {
  id: string;
  name: string;
  scriptPath: string;
  status: string;
  toolCount: number;
  tools: Array<{ name: string; description: string }>;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  serverId?: string;
}

interface UseMCPReturn {
  connectedServers: MCPServerInfo[];
  tools: MCPTool[];
  isConnecting: boolean;
  error: string | null;
  connect: (path: string) => Promise<void>;
  disconnect: (serverId: string) => Promise<void>;
  refreshServers: () => Promise<void>;
}

/**
 * useMCP Hook - Manage MCP Server Connections
 * Provides state management and methods for MCP server connections
 * Requirements: 6.1, 6.4, 6.5
 */
export const useMCP = (): UseMCPReturn => {
  const [connectedServers, setConnectedServers] = useState<MCPServerInfo[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connected servers from main process
  const refreshServers = useCallback(async () => {
    try {
      const servers = await window.api.mcp.listServers();
      setConnectedServers(servers);
      
      // Also refresh tools list
      const allTools = await window.api.mcp.listTools();
      setTools(allTools);
    } catch (err) {
      console.error('Failed to refresh servers:', err);
    }
  }, []);

  // Connect to a new MCP server
  const connect = useCallback(async (path: string) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      await window.api.mcp.connect(path);
      await refreshServers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to server';
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [refreshServers]);

  // Disconnect from an MCP server
  const disconnect = useCallback(async (serverId: string) => {
    try {
      await window.api.mcp.disconnect(serverId);
      await refreshServers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from server';
      setError(errorMessage);
      throw err;
    }
  }, [refreshServers]);

  // Initial load and polling for server status updates
  useEffect(() => {
    // Load servers on mount
    refreshServers();

    // Poll for server status every 5 seconds
    const interval = setInterval(refreshServers, 5000);

    return () => clearInterval(interval);
  }, [refreshServers]);

  return {
    connectedServers,
    tools,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshServers,
  };
};

export default useMCP;
