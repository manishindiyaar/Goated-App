#!/usr/bin/env python3
"""
Mock MCP Server for Testing
A simple MCP server with basic tools for testing the GoatedApp MCP client.
"""

import asyncio
import json
import sys
from datetime import datetime
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent


# Create server instance
app = Server("test-server")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="get_current_time",
            description="Get the current date and time",
            inputSchema={
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Timezone (optional, defaults to local)",
                    }
                },
                "required": [],
            },
        ),
        Tool(
            name="calculate",
            description="Perform basic arithmetic calculations",
            inputSchema={
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "The operation to perform: add, subtract, multiply, divide",
                        "enum": ["add", "subtract", "multiply", "divide"],
                    },
                    "a": {
                        "type": "number",
                        "description": "First number",
                    },
                    "b": {
                        "type": "number",
                        "description": "Second number",
                    },
                },
                "required": ["operation", "a", "b"],
            },
        ),
        Tool(
            name="echo",
            description="Echo back the provided message",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "The message to echo back",
                    }
                },
                "required": ["message"],
            },
        ),
        Tool(
            name="generate_random",
            description="Generate a random number within a range",
            inputSchema={
                "type": "object",
                "properties": {
                    "min": {
                        "type": "number",
                        "description": "Minimum value (default: 0)",
                    },
                    "max": {
                        "type": "number",
                        "description": "Maximum value (default: 100)",
                    },
                },
                "required": [],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle tool execution."""
    
    if name == "get_current_time":
        timezone = arguments.get("timezone", "local")
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return [
            TextContent(
                type="text",
                text=f"Current time ({timezone}): {current_time}"
            )
        ]
    
    elif name == "calculate":
        operation = arguments["operation"]
        a = float(arguments["a"])
        b = float(arguments["b"])
        
        if operation == "add":
            result = a + b
        elif operation == "subtract":
            result = a - b
        elif operation == "multiply":
            result = a * b
        elif operation == "divide":
            if b == 0:
                return [TextContent(type="text", text="Error: Division by zero")]
            result = a / b
        else:
            return [TextContent(type="text", text=f"Error: Unknown operation '{operation}'")]
        
        return [
            TextContent(
                type="text",
                text=f"Result: {a} {operation} {b} = {result}"
            )
        ]
    
    elif name == "echo":
        message = arguments["message"]
        return [
            TextContent(
                type="text",
                text=f"Echo: {message}"
            )
        ]
    
    elif name == "generate_random":
        import random
        min_val = arguments.get("min", 0)
        max_val = arguments.get("max", 100)
        random_num = random.uniform(min_val, max_val)
        return [
            TextContent(
                type="text",
                text=f"Random number between {min_val} and {max_val}: {random_num:.2f}"
            )
        ]
    
    else:
        return [TextContent(type="text", text=f"Error: Unknown tool '{name}'")]


async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
