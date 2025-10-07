# MCP HTTP Server Setup

The Pluto Notebook extension now runs an HTTP-based MCP (Model Context Protocol) server that shares the same PlutoManager instance with the VS Code extension. This means both the extension and external MCP clients (like Claude Desktop) can work with the same Pluto server and notebook sessions.

## Benefits

- **Shared State**: The extension and MCP clients share the same Pluto server connection and worker sessions
- **No Duplicate Processes**: Single Pluto server instance managed by the extension
- **HTTP-based**: More flexible than stdio, works with any HTTP client
- **Health Monitoring**: Built-in health check endpoint

## Configuration

The MCP server can be configured with the following settings:

```json
{
  "pluto-notebook.port": 1234,              // Pluto server port
  "pluto-notebook.mcpPort": 3100,           // MCP HTTP server port
  "pluto-notebook.autoStartMcpServer": true // Auto-start MCP server (default: true)
}
```

### Auto-Start Behavior

By default, the MCP server starts automatically when the extension activates. To disable auto-start:

1. Open VS Code settings
2. Search for "Pluto Notebook"
3. Uncheck "Auto Start Mcp Server"

Or add to your `settings.json`:
```json
{
  "pluto-notebook.autoStartMcpServer": false
}
```

When auto-start is disabled, use `Pluto: Start MCP Server` command to start manually.

## Endpoints

- **SSE Stream**: `http://localhost:3100/mcp` (GET)
- **Messages**: `http://localhost:3100/messages` (POST)
- **Health Check**: `http://localhost:3100/health` (GET)

## Using with Claude Desktop or GitHub Copilot

The extension provides easy configuration for both Claude Desktop and GitHub Copilot.

### Quick Setup

1. Run the command: `Pluto: Create MCP Config (Claude or Copilot)`
2. Choose which tool to configure:
   - **Claude Desktop** - Creates/updates `claude_desktop_config.json` in workspace root
   - **GitHub Copilot** - Creates/updates `.vscode/settings.json` in workspace
3. The config file will be opened automatically for review

Alternatively, use `Pluto: Get MCP HTTP Server URL` for more options:
- Copy URL
- Create Claude Config
- Create Copilot Config
- Open Health Check

### Manual Configuration

#### Claude Desktop

Add to your Claude Desktop config file:

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

#### GitHub Copilot

Add to your workspace `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "pluto-notebook": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

## Available MCP Tools

The MCP server exposes the following tools:

1. **start_pluto_server**: Start the Pluto server
2. **connect_to_pluto_server**: Connect to an existing Pluto server
3. **stop_pluto_server**: Stop the Pluto server
4. **open_notebook**: Open a Pluto notebook and create a worker session
5. **list_notebooks**: Get a list of all open notebooks with their paths and IDs
6. **execute_cell**: Execute an existing cell by ID
7. **create_cell**: Create and execute a new cell
8. **edit_cell**: Update the code of an existing cell
9. **read_cell**: Read the code and output of a cell
10. **execute_code**: Execute Julia code without creating a persistent cell (ephemeral)
11. **get_notebook_status**: Get server and notebook status

### Tool Details

**execute_code** - Useful for quick evaluations or queries without modifying the notebook structure. The code is executed in the notebook context (has access to all notebook variables), but the cell is immediately deleted after execution, leaving no trace in the notebook file.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                VS Code Extension                     │
│  ┌────────────────┐        ┌──────────────────┐    │
│  │   Controller   │───────▶│  PlutoManager    │◀───┼───┐
│  │   Serializer   │        │  (Shared)        │    │   │
│  └────────────────┘        └──────────────────┘    │   │
│                                      │               │   │
│                                      ▼               │   │
│                            ┌──────────────────┐     │   │
│                            │  Pluto Server    │     │   │
│                            │  (Julia Process) │     │   │
│                            └──────────────────┘     │   │
└─────────────────────────────────────────────────────┘   │
                                                           │
┌─────────────────────────────────────────────────────┐   │
│              MCP HTTP Server                        │   │
│  ┌────────────────────────────────────────────┐    │   │
│  │  HTTP/SSE Endpoints                        │    │   │
│  │  - GET  /mcp (SSE stream)                  │    │   │
│  │  - POST /messages (JSON-RPC)               │    │   │
│  │  - GET  /health (health check)             │    │   │
│  └────────────────────────────────────────────┘    │   │
│                      │                              │   │
└──────────────────────┼──────────────────────────────┘   │
                       │                                  │
                       └──────────────────────────────────┘
                                (Shared PlutoManager)

         ▲
         │
    ┌────┴─────┐
    │  Claude  │
    │ Desktop  │
    │   (MCP   │
    │  Client) │
    └──────────┘
```

## Commands

### Pluto Server Commands
- **Pluto: Start Server**: Manually start the Pluto server
- **Pluto: Stop Server**: Stop the Pluto server
- **Pluto: Restart Server**: Restart the Pluto server

### MCP Server Commands
- **Pluto: Start MCP Server**: Start the MCP HTTP server
- **Pluto: Stop MCP Server**: Stop the MCP HTTP server
- **Pluto: Restart MCP Server**: Restart the MCP HTTP server

### Configuration Commands
- **Pluto: Create MCP Config (Claude or Copilot)**: Interactive config creation with choice of target tool
- **Pluto: Get MCP HTTP Server URL**: Get the MCP server URL and configuration options

## Health Check

You can check the MCP server status:

```bash
curl http://localhost:3100/health
```

Response:
```json
{
  "status": "ok",
  "plutoServerRunning": true,
  "activeSessions": 1
}
```

## Troubleshooting

### MCP Server Won't Start

1. Check if auto-start is enabled: `pluto-notebook.autoStartMcpServer`
2. Try starting manually: `Pluto: Start MCP Server`
3. Check the "Pluto Server" output channel for errors

### Port Already in Use

If port 3100 is already in use:
1. Change the `pluto-notebook.mcpPort` setting to a different port
2. Restart the MCP server: `Pluto: Restart MCP Server`

### Cannot Connect from Claude Desktop

1. Make sure the extension is activated in VS Code
2. Check the "Pluto Server" output channel for errors
3. Verify the health check endpoint works: `http://localhost:3100/health`
4. Ensure the correct URL is in your Claude Desktop config

### Shared State Issues

The extension and MCP clients share the same PlutoManager. If you close a notebook in VS Code, it will also be closed for MCP clients.
