# Pluto Notebook MCP Server

The extension includes an MCP (Model Context Protocol) server that allows AI assistants like Claude to interact with Pluto notebooks programmatically.

## Setup

### Build the MCP Server

```bash
npm run compile
```

This builds `dist/mcp-server.cjs` which can be used as an MCP server.

### Configure Claude Desktop

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "pluto-notebook": {
      "command": "node",
      "args": ["/absolute/path/to/pluto-notebook/dist/mcp-server.cjs"]
    }
  }
}
```

Or run directly:

```bash
npm run mcp
```

## Available Tools

### start_pluto_server

Start a Pluto server instance.

**Parameters:**
- `port` (optional): Port number (default: 1234)

**Example:**
```
Use start_pluto_server with port 1234
```

### stop_pluto_server

Stop the running Pluto server.

**Example:**
```
Use stop_pluto_server
```

### open_notebook

Open a Pluto notebook file.

**Parameters:**
- `path` (required): Absolute path to the .jl file

**Example:**
```
Use open_notebook with path "/path/to/notebook.jl"
```

### execute_cell

Execute Julia code in an open notebook.

**Parameters:**
- `path` (required): Path to the notebook
- `code` (required): Julia code to execute

**Example:**
```
Use execute_cell with:
- path: "/path/to/notebook.jl"
- code: "x = 1 + 1"
```

**Returns:**
```json
{
  "cell_id": "uuid...",
  "output": { "mime": "text/plain", "body": "2" },
  "runtime": 123456,
  "errored": false
}
```

### get_notebook_status

Get the status of the Pluto server.

**Returns:**
```json
{
  "server_running": true,
  "message": "Pluto server is running"
}
```

## Example Workflow with Claude

1. **Start Pluto:**
   > Start the Pluto server on port 1234

2. **Open a notebook:**
   > Open the notebook at /path/to/my/notebook.jl

3. **Execute code:**
   > Execute this Julia code in the notebook:
   > ```julia
   > using Plots
   > plot(sin, 0, 2π)
   > ```

4. **Stop when done:**
   > Stop the Pluto server

## Integration with VS Code Extension

The MCP server reuses the same `PlutoManager` class that the VS Code extension uses, ensuring consistent behavior between the extension and the MCP server.

## Architecture

```
┌─────────────────┐
│  Claude/AI CLI  │
└────────┬────────┘
         │ MCP Protocol (stdio)
         ↓
┌─────────────────┐
│  MCP Server     │
│  (Node.js)      │
└────────┬────────┘
         │ Uses
         ↓
┌─────────────────┐
│  PlutoManager   │
│  (Shared code)  │
└────────┬────────┘
         │ @plutojl/rainbow
         ↓
┌─────────────────┐
│  Pluto Server   │
│  (Julia)        │
└─────────────────┘
```

## Development

The MCP server source is at `src/mcp-server.ts` and gets built to `dist/mcp-server.cjs` by esbuild.

To test:
```bash
# Build
npm run compile

# Run
npm run mcp

# Or directly
node dist/mcp-server.cjs
```

## Troubleshooting

**"Pluto server is not running"**
- Start the server first with `start_pluto_server`

**"Failed to create worker for notebook"**
- Make sure the Pluto server is running
- Check that the notebook path is correct and the file exists

**"Module not found" errors**
- Run `npm install` to ensure all dependencies are installed
- Rebuild with `npm run compile`
