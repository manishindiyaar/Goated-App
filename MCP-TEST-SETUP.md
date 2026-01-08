# MCP Test Server Setup

This is a simple mock MCP server for testing the GoatedApp MCP client integration.

## Setup

1. **Install MCP Python package:**
   ```bash
   pip install mcp
   ```

   Or use the requirements file:
   ```bash
   pip install -r mcp-requirements.txt
   ```

2. **Make the server executable (optional):**
   ```bash
   chmod +x mcp-test-server.py
   ```

## Testing in GoatedApp

1. **Start your GoatedApp** (in development mode):
   ```bash
   npm run dev
   ```

2. **Click the "+" button** in the top-right corner of the app

3. **Paste the full path to the server:**
   ```
   /Users/manish/Desktop/Goated-App/mcp-test-server.py
   ```
   
   (Replace with your actual path - use `pwd` in terminal to get it)

4. **Click "Connect"**

## Available Tools

The test server provides 4 simple tools:

### 1. get_current_time
Get the current date and time.
- **Parameters:** 
  - `timezone` (optional): Timezone name

### 2. calculate
Perform basic arithmetic calculations.
- **Parameters:**
  - `operation` (required): "add", "subtract", "multiply", or "divide"
  - `a` (required): First number
  - `b` (required): Second number

### 3. echo
Echo back a message.
- **Parameters:**
  - `message` (required): The message to echo

### 4. generate_random
Generate a random number within a range.
- **Parameters:**
  - `min` (optional): Minimum value (default: 0)
  - `max` (optional): Maximum value (default: 100)

## Testing Tool Execution

Once connected, try asking the AI:
- "What time is it?"
- "Calculate 15 + 27"
- "Echo hello world"
- "Generate a random number between 1 and 100"

The AI should automatically use the appropriate tools to answer your questions!

## Troubleshooting

### Server won't connect
- Make sure you have `mcp` package installed: `pip install mcp`
- Check that Python 3 is available: `python3 --version`
- Verify the full path to the server file is correct
- Check the Electron console for error messages

### Tools not executing
- Check the browser console (DevTools) for errors
- Look at the Electron main process logs
- Verify your Gemini API key is set in Settings

## Quick Test Path

Get the full path to paste:
```bash
cd /Users/manish/Desktop/Goated-App
pwd
# Then append: /mcp-test-server.py
```

Full path will be something like:
```
/Users/manish/Desktop/Goated-App/mcp-test-server.py
```
