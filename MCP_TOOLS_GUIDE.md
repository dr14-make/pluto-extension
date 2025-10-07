# MCP Tools Usage Guide

This guide provides examples of how to use each MCP tool exposed by the Pluto Notebook HTTP server.

## Server Management

### start_pluto_server
Start the Pluto server on the configured port.

```json
{
  "name": "start_pluto_server",
  "arguments": {
    "port": 1234
  }
}
```

### connect_to_pluto_server
Connect to an already running Pluto server (useful if Julia is running externally).

```json
{
  "name": "connect_to_pluto_server",
  "arguments": {
    "port": 1234
  }
}
```

### stop_pluto_server
Stop the running Pluto server.

```json
{
  "name": "stop_pluto_server",
  "arguments": {}
}
```

### get_notebook_status
Check if the Pluto server is running.

```json
{
  "name": "get_notebook_status",
  "arguments": {}
}
```

Response:
```json
{
  "server_running": true,
  "message": "Pluto server is running"
}
```

## Notebook Management

### open_notebook
Open a Pluto notebook and create a worker session.

```json
{
  "name": "open_notebook",
  "arguments": {
    "path": "/path/to/notebook.jl"
  }
}
```

Response:
```json
{
  "message": "Notebook opened: /path/to/notebook.jl\nNotebook ID: abc-123-def"
}
```

### list_notebooks
Get a list of all currently open notebooks.

```json
{
  "name": "list_notebooks",
  "arguments": {}
}
```

Response:
```json
{
  "count": 2,
  "notebooks": [
    {
      "path": "/path/to/notebook1.jl",
      "notebookId": "abc-123-def"
    },
    {
      "path": "/path/to/notebook2.jl",
      "notebookId": "xyz-456-ghi"
    }
  ]
}
```

## Cell Operations

### create_cell
Create a new cell and execute it.

```json
{
  "name": "create_cell",
  "arguments": {
    "path": "/path/to/notebook.jl",
    "code": "x = 1 + 1",
    "index": 0
  }
}
```

Response:
```json
{
  "cell_id": "abc-123",
  "output": {
    "body": "2",
    "mime": "text/plain"
  },
  "runtime": 0.05,
  "errored": false,
  "message": "Cell created and executed successfully"
}
```

### read_cell
Read the code and output of an existing cell.

```json
{
  "name": "read_cell",
  "arguments": {
    "path": "/path/to/notebook.jl",
    "cell_id": "abc-123"
  }
}
```

Response:
```json
{
  "cell_id": "abc-123",
  "code": "x = 1 + 1",
  "output": {
    "body": "2",
    "mime": "text/plain"
  },
  "runtime": 0.05,
  "errored": false,
  "running": false,
  "queued": false
}
```

### edit_cell
Update the code of an existing cell.

```json
{
  "name": "edit_cell",
  "arguments": {
    "path": "/path/to/notebook.jl",
    "cell_id": "abc-123",
    "code": "x = 2 + 2",
    "run": true
  }
}
```

Response:
```json
{
  "cell_id": "abc-123",
  "output": {
    "body": "4",
    "mime": "text/plain"
  },
  "runtime": 0.03,
  "errored": false,
  "message": "Cell updated and executed successfully"
}
```

### execute_cell
Execute an existing cell (runs current code in the cell).

```json
{
  "name": "execute_cell",
  "arguments": {
    "path": "/path/to/notebook.jl",
    "cell_id": "abc-123"
  }
}
```

Response:
```json
{
  "cell_id": "abc-123",
  "output": {
    "body": "4",
    "mime": "text/plain"
  },
  "runtime": 0.03,
  "errored": false
}
```

## Code Execution

### execute_code
Execute Julia code without creating a persistent cell (ephemeral execution).

This is useful for:
- Quick queries or evaluations
- Testing code snippets
- Inspecting variable values
- Running diagnostic commands

The code has access to all variables defined in the notebook, but doesn't modify the notebook structure.

```json
{
  "name": "execute_code",
  "arguments": {
    "path": "/path/to/notebook.jl",
    "code": "println(\"x = $x\")"
  }
}
```

Response:
```json
{
  "output": {
    "body": "x = 4",
    "mime": "text/plain"
  },
  "runtime": 0.01,
  "errored": false,
  "message": "Code executed successfully (no cell created)"
}
```

**Important**: The cell is created temporarily and deleted immediately after execution. It will not appear in the notebook file.

## Error Handling

All tools return error information when something goes wrong:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Pluto server is not running"
    }
  ]
}
```

Common errors:
- `"Pluto server is not running"` - Start the server first
- `"Notebook {path} is not open"` - Open the notebook first
- `"Cell {id} not found"` - Invalid cell ID

## Example Workflows

### Workflow 1: Quick Data Analysis

1. **Start server and open notebook**:
```json
{"name": "start_pluto_server", "arguments": {}}
{"name": "open_notebook", "arguments": {"path": "/path/to/analysis.jl"}}
```

2. **Check what notebooks are open**:
```json
{"name": "list_notebooks", "arguments": {}}
```

3. **Execute quick queries without modifying notebook**:
```json
{"name": "execute_code", "arguments": {
  "path": "/path/to/analysis.jl",
  "code": "summary(dataframe)"
}}
```

### Workflow 2: Interactive Development

1. **Create cells incrementally**:
```json
{"name": "create_cell", "arguments": {
  "path": "/path/to/notebook.jl",
  "code": "using DataFrames",
  "index": 0
}}
```

2. **Edit and refine**:
```json
{"name": "edit_cell", "arguments": {
  "path": "/path/to/notebook.jl",
  "cell_id": "abc-123",
  "code": "using DataFrames, Plots"
}}
```

3. **Test with ephemeral execution**:
```json
{"name": "execute_code", "arguments": {
  "path": "/path/to/notebook.jl",
  "code": "plot(1:10, rand(10))"
}}
```

### Workflow 3: Notebook Inspection

1. **List all open notebooks**:
```json
{"name": "list_notebooks", "arguments": {}}
```

2. **Read specific cells**:
```json
{"name": "read_cell", "arguments": {
  "path": "/path/to/notebook.jl",
  "cell_id": "abc-123"
}}
```

3. **Query variable state without creating cells**:
```json
{"name": "execute_code", "arguments": {
  "path": "/path/to/notebook.jl",
  "code": "varinfo()"
}}
```
