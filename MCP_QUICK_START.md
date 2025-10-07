# Pluto Notebook MCP - Quick Start Guide

Get started with the Pluto Notebook MCP server in 2 minutes!

## What is This?

The Pluto Notebook extension includes an HTTP-based MCP (Model Context Protocol) server that lets AI assistants like Claude Desktop and GitHub Copilot interact with your Julia Pluto notebooks.

## Quick Setup

### Step 1: Activate the Extension

Open any `.jl` file in VS Code. The extension will:
- ✅ Automatically start the Pluto server
- ✅ Automatically start the MCP HTTP server on port 3100
- ✅ Show status in "Pluto Server" output channel

### Step 2: Configure Your AI Tool

Run this command in VS Code:
```
Pluto: Create MCP Config (Claude or Copilot)
```

Choose your tool:
- **Claude Desktop** → Creates `claude_desktop_config.json`
- **GitHub Copilot** → Updates `.vscode/settings.json`

### Step 3: Restart Your AI Tool

- **Claude Desktop**: Restart the app
- **GitHub Copilot**: Reload VS Code window (`Ctrl+Shift+P` → "Reload Window")

### Step 4: Test It!

Ask your AI assistant:
```
List all open Pluto notebooks
```

or

```
Execute this code in my notebook: println("Hello from MCP!")
```

## Available Commands

### MCP Server Commands
| Command | Description |
|---------|-------------|
| `Pluto: Start MCP Server` | Manually start MCP HTTP server |
| `Pluto: Stop MCP Server` | Stop MCP HTTP server |
| `Pluto: Restart MCP Server` | Restart MCP HTTP server |

### Pluto Server Commands
| Command | Description |
|---------|-------------|
| `Pluto: Start Server` | Manually start Pluto server |
| `Pluto: Stop Server` | Stop Pluto server |
| `Pluto: Restart Server` | Restart Pluto server |

### Configuration Commands
| Command | Description |
|---------|-------------|
| `Pluto: Create MCP Config (Claude or Copilot)` | Create config file with interactive picker |
| `Pluto: Get MCP HTTP Server URL` | Get URL and config options |

## Configuration

Default settings:
```json
{
  "pluto-notebook.port": 1234,              // Pluto server port
  "pluto-notebook.mcpPort": 3100,           // MCP HTTP server port
  "pluto-notebook.autoStartMcpServer": true // Auto-start MCP server
}
```

**Auto-Start**: The MCP server starts automatically by default. To disable:
- Set `pluto-notebook.autoStartMcpServer` to `false`
- Then use `Pluto: Start MCP Server` to start manually

## What Can AI Assistants Do?

Through MCP, AI assistants can:

- 📋 **List notebooks** - See all open notebooks
- ▶️ **Execute code** - Run Julia code without modifying notebook
- 📝 **Create cells** - Add new cells with code
- ✏️ **Edit cells** - Update existing cell code
- 👀 **Read cells** - View cell code and output
- 🔍 **Query status** - Check server and notebook status

## Example Prompts

Try asking Claude or Copilot:

**Basic Operations:**
```
- "List all open notebooks"
- "Open the notebook at /path/to/analysis.jl"
- "What's the status of the Pluto server?"
```

**Code Execution:**
```
- "Execute: 2 + 2"
- "Run this code without saving: println(x)"
- "What's the value of variable x?"
```

**Notebook Manipulation:**
```
- "Create a cell that imports DataFrames"
- "Edit cell abc-123 to use Plots instead of StatsPlots"
- "Show me the output of cell xyz-789"
```

## Troubleshooting

### MCP Server Not Starting

Check the "Pluto Server" output channel in VS Code:
```
View → Output → Select "Pluto Server"
```

### Port Already in Use

Change the port in settings:
```json
{
  "pluto-notebook.mcpPort": 3200  // Use different port
}
```

Then recreate your config.

### Claude Desktop Can't Connect

1. Verify extension is active (open a `.jl` file)
2. Check health endpoint: `http://localhost:3100/health`
3. Verify config file location:
   - **Claude Desktop config**: Workspace root
   - **Name**: `claude_desktop_config.json`
4. Restart Claude Desktop

### GitHub Copilot Can't Connect

1. Verify config in `.vscode/settings.json`
2. Reload VS Code window
3. Check MCP support is enabled in Copilot settings

## Manual Configuration

If you prefer to configure manually:

**Claude Desktop** (`claude_desktop_config.json`):
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

**GitHub Copilot** (`.vscode/settings.json`):
```json
{
  "github.copilot.chat.mcp.servers": {
    "pluto-notebook": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

## Health Check

Verify the MCP server is running:

```bash
curl http://localhost:3100/health
```

Expected response:
```json
{
  "status": "ok",
  "plutoServerRunning": true,
  "activeSessions": 0
}
```

## Learn More

- **Full Setup Guide**: `MCP_HTTP_SETUP.md`
- **Tool Reference**: `MCP_TOOLS_GUIDE.md`
- **Change History**: `MCP_CHANGES_SUMMARY.md`
- **Cleanup Notes**: `CLEANUP_SUMMARY.md`

## Support

If you encounter issues:

1. Check the "Pluto Server" output channel
2. Verify health endpoint responds
3. Review configuration files
4. Restart the extension/IDE
5. File an issue with logs

## Tips

💡 **Pro Tips:**
- Use `execute_code` for quick queries without modifying notebooks
- The `list_notebooks` tool shows all open notebooks with their paths
- MCP server shares state with the VS Code extension
- Changes via MCP are reflected immediately in VS Code
- Close notebooks in VS Code to free up MCP resources

🎯 **Best Practices:**
- Keep one notebook open at a time for focused work
- Use ephemeral execution for exploration
- Create persistent cells for important code
- Check health endpoint before debugging

---

**Ready to go!** 🚀

Open a `.jl` file, run `Pluto: Create MCP Config`, and start chatting with your AI assistant about your Pluto notebooks!
