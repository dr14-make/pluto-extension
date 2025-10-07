# MCP HTTP Server - Changes Summary

## Overview

The MCP server has been converted from stdio to HTTP/SSE and tightly integrated with the VS Code extension through a shared PlutoManager instance.

## Key Changes

### 1. HTTP/SSE Transport
- **Before**: Stdio-based MCP server (separate process)
- **After**: HTTP/SSE server running inside the extension
- **Benefit**: More flexible, easier to debug, works with web-based clients

### 2. Shared PlutoManager
- **Before**: Separate PlutoManager instances for extension and MCP
- **After**: Single shared instance (`src/shared/plutoManagerInstance.ts`)
- **Benefit**: Extension and MCP clients work with the same notebooks and server connection

### 3. New MCP Tools

Added two new tools:

#### `list_notebooks`
Lists all currently open notebooks with their paths and IDs.

**Use case**: Discover what notebooks are available before executing code.

**Example**:
```json
{
  "name": "list_notebooks",
  "arguments": {}
}
```

**Response**:
```json
{
  "count": 2,
  "notebooks": [
    {"path": "/path/to/notebook.jl", "notebookId": "abc-123"},
    {"path": "/path/to/other.jl", "notebookId": "def-456"}
  ]
}
```

#### `execute_code`
Executes Julia code without creating a persistent cell (ephemeral execution).

**Use case**:
- Quick queries and evaluations
- Inspecting variable values
- Testing code without modifying notebook structure
- Running diagnostic commands

**How it works**:
1. Creates a temporary cell at index 0
2. Executes the code (has access to all notebook variables)
3. Immediately deletes the cell after execution
4. Returns the output

**Example**:
```json
{
  "name": "execute_code",
  "arguments": {
    "path": "/path/to/notebook.jl",
    "code": "println(\"x = $x\")"
  }
}
```

**Response**:
```json
{
  "output": {"body": "x = 4", "mime": "text/plain"},
  "runtime": 0.01,
  "errored": false,
  "message": "Code executed successfully (no cell created)"
}
```

## Architecture

```
Extension <─┬─> Shared PlutoManager <──> Pluto Server (Julia)
            │
            └─> MCP HTTP Server <──> External Clients (Claude Desktop)
```

Both the extension and MCP clients use the same:
- Pluto server connection
- Worker sessions (notebooks)
- Execution context

## Configuration

New setting added:
```json
{
  "pluto-notebook.mcpPort": 3100  // HTTP MCP server port
}
```

## New Commands

- **Pluto: Get MCP HTTP Server URL**
  - Copy SSE endpoint URL
  - Copy SSE config for Claude Desktop
  - Open health check in browser

## Files Added/Modified

### New Files
- `src/shared/plutoManagerInstance.ts` - Shared PlutoManager singleton
- `src/mcp-server-http.ts` - HTTP/SSE-based MCP server
- `MCP_HTTP_SETUP.md` - Setup and configuration guide
- `MCP_TOOLS_GUIDE.md` - Detailed tool usage examples
- `MCP_CHANGES_SUMMARY.md` - This file

### Modified Files
- `src/extension.ts` - Now starts HTTP MCP server on activation
- `src/plutoManager.ts` - Added `getOpenNotebooks()` and `executeCodeEphemeral()`
- `src/commands.ts` - Added `getMCPHttpUrl` command
- `package.json` - Added `mcpPort` config and new command

## Usage with Claude Desktop

1. Run command: `Pluto: Get MCP HTTP Server URL`
2. Click "Copy SSE Config"
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "pluto-notebook": {
      "url": "http://localhost:3100/mcp",
      "transport": "sse"
    }
  }
}
```

## Testing

Build the extension:
```bash
npm run compile
```

Start debugging with F5 in VS Code to test the integrated setup.

## Benefits Summary

✅ **Unified state** - Extension and MCP share the same Pluto connection
✅ **HTTP-based** - Easier to debug, more flexible transport
✅ **Auto-start** - MCP server starts automatically with extension
✅ **New tools** - List notebooks and execute code ephemerally
✅ **Better ergonomics** - No need to manage separate processes
✅ **Health monitoring** - Built-in `/health` endpoint

## Configuration Support

The extension now supports creating configs for both:
- **Claude Desktop** (`claude_desktop_config.json` in workspace root)
- **GitHub Copilot** (`.vscode/settings.json` in workspace)

Use the command `Pluto: Create MCP Config (Claude or Copilot)` and choose which tool to configure.

## Migration Notes

- ✅ Old stdio MCP server (`src/mcp-server.ts`) has been removed
- ✅ Build configuration updated (no longer builds standalone MCP server)
- ✅ `npm run mcp` script removed (MCP server now runs inside extension)
- ✅ Old `getMCPServerPath` command removed
- ✅ New config creation commands support both Claude and Copilot
- No breaking changes for existing VS Code extension users
