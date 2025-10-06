import "@plutojl/rainbow/node-polyfill";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PlutoManager } from "./plutoManager.ts";

// Simple output channel that implements minimal VS Code OutputChannel interface
class MCPOutputChannel {
  readonly name: string = "Pluto MCP";

  appendLine(message: string): void {
    console.error(`[Pluto] ${message}`);
  }

  showWarningMessage<T extends string>(
    message: string,
    ...items: T[]
  ): Thenable<T | undefined> {
    console.error(`[Pluto WARNING] ${message}`);
    return Promise.resolve(undefined);
  }
}

class PlutoMCPServer {
  private server: Server;
  private plutoManager: PlutoManager;

  constructor() {
    this.server = new Server(
      {
        name: "pluto-notebook-mcp-server",
        version: "0.0.1",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Create output channel that writes to stderr
    const outputChannel = new MCPOutputChannel();

    this.plutoManager = new PlutoManager(1234, outputChannel);
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "start_pluto_server",
          description: "Start the Pluto server on a specified port",
          inputSchema: {
            type: "object",
            properties: {
              port: {
                type: "number",
                description: "Port number for the Pluto server (default: 1234)",
              },
            },
          },
        },
        {
          name: "connect_to_pluto_server",
          description:
            "Connect to an existing Pluto server (assumes server is already running)",
          inputSchema: {
            type: "object",
            properties: {
              port: {
                type: "number",
                description:
                  "Port number of the running Pluto server (default: 1234)",
              },
            },
          },
        },
        {
          name: "stop_pluto_server",
          description: "Stop the running Pluto server",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "open_notebook",
          description: "Open a Pluto notebook file and create a worker session",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the .jl notebook file",
              },
            },
            required: ["path"],
          },
        },
        {
          name: "execute_cell",
          description: "Execute an existing code cell in an open notebook by its ID",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the notebook",
              },
              cell_id: {
                type: "string",
                description: "UUID of the cell to execute",
              },
            },
            required: ["path", "cell_id"],
          },
        },
        {
          name: "create_cell",
          description: "Create and execute a new cell in a notebook",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the notebook",
              },
              code: {
                type: "string",
                description: "Julia code for the new cell",
              },
              index: {
                type: "number",
                description: "Cell index position (default: 0)",
              },
            },
            required: ["path", "code"],
          },
        },
        {
          name: "edit_cell",
          description: "Update the code of an existing cell",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the notebook",
              },
              cell_id: {
                type: "string",
                description: "UUID of the cell to edit",
              },
              code: {
                type: "string",
                description: "New Julia code for the cell",
              },
              run: {
                type: "boolean",
                description:
                  "Whether to run the cell after updating (default: true)",
              },
            },
            required: ["path", "cell_id", "code"],
          },
        },
        {
          name: "read_cell",
          description: "Read the code and output of a cell by its ID",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the notebook",
              },
              cell_id: {
                type: "string",
                description: "UUID of the cell to read",
              },
            },
            required: ["path", "cell_id"],
          },
        },
        {
          name: "get_notebook_status",
          description: "Get the status of the Pluto server and open notebooks",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "start_pluto_server":
            return await this.startPlutoServer((args?.port as number) || 1234);

          case "connect_to_pluto_server":
            return await this.connectToPlutoServer(
              (args?.port as number) || 1234
            );

          case "stop_pluto_server":
            return await this.stopPlutoServer();

          case "open_notebook":
            if (!args?.path) {
              throw new Error("path is required");
            }
            return await this.openNotebook(args.path as string);

          case "execute_cell":
            if (!args?.path || !args?.cell_id) {
              throw new Error("path and cell_id are required");
            }
            return await this.executeCell(
              args.path as string,
              args.cell_id as string
            );

          case "create_cell":
            if (!args?.path || !args?.code) {
              throw new Error("path and code are required");
            }
            return await this.createCell(
              args.path as string,
              args.code as string,
              (args?.index as number) || 0
            );

          case "edit_cell":
            if (!args?.path || !args?.cell_id || !args?.code) {
              throw new Error("path, cell_id, and code are required");
            }
            return await this.editCell(
              args.path as string,
              args.cell_id as string,
              args.code as string,
              args?.run !== false
            );

          case "read_cell":
            if (!args?.path || !args?.cell_id) {
              throw new Error("path and cell_id are required");
            }
            return await this.readCell(
              args.path as string,
              args.cell_id as string
            );

          case "get_notebook_status":
            return await this.getStatus();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async startPlutoServer(port: number): Promise<any> {
    if (this.plutoManager.isRunning()) {
      return {
        content: [
          {
            type: "text",
            text: "Pluto server is already running",
          },
        ],
      };
    }

    await this.plutoManager.start();
    return {
      content: [
        {
          type: "text",
          text: `Pluto server started on port ${port}`,
        },
      ],
    };
  }

  private async connectToPlutoServer(port: number): Promise<any> {
    if (this.plutoManager.isConnected()) {
      return {
        content: [
          {
            type: "text",
            text: "Already connected to a Pluto server",
          },
        ],
      };
    }

    await this.plutoManager.connect();
    return {
      content: [
        {
          type: "text",
          text: `Connected to Pluto server at port ${port}`,
        },
      ],
    };
  }

  private async stopPlutoServer(): Promise<any> {
    if (!this.plutoManager.isRunning()) {
      return {
        content: [
          {
            type: "text",
            text: "No Pluto server is running",
          },
        ],
      };
    }

    await this.plutoManager.stop();

    return {
      content: [
        {
          type: "text",
          text: "Pluto server stopped",
        },
      ],
    };
  }

  private async openNotebook(path: string): Promise<any> {
    if (!this.plutoManager.isConnected()) {
      throw new Error(
        "Pluto server is not running. Start it first with start_pluto_server"
      );
    }

    // Create a URI for the notebook
    const worker = await this.plutoManager.getWorker(path);

    if (!worker) {
      throw new Error("Failed to create worker for notebook");
    }

    return {
      content: [
        {
          type: "text",
          text: `Notebook opened: ${path}\nNotebook ID: ${worker.notebook_id}`,
        },
      ],
    };
  }

  private async executeCell(path: string, cellId: string): Promise<any> {
    if (!this.plutoManager.isConnected()) {
      throw new Error("Pluto server is not running");
    }

    const worker = await this.plutoManager.getWorker(path);

    if (!worker) {
      throw new Error(`Notebook ${path} is not open`);
    }

    // Get the current cell code
    const cellData = worker.getSnippet(cellId);

    if (!cellData) {
      throw new Error(`Cell ${cellId} not found`);
    }

    // Execute the cell using PlutoManager
    const result = await this.plutoManager.executeCell(
      worker,
      cellId,
      cellData.input.code
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              cell_id: cellId,
              output: result?.output,
              runtime: result?.runtime,
              errored: result?.errored,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async createCell(
    path: string,
    code: string,
    index: number = 0
  ): Promise<any> {
    if (!this.plutoManager.isConnected()) {
      throw new Error("Pluto server is not running");
    }

    const worker = await this.plutoManager.getWorker(path);

    if (!worker) {
      throw new Error(`Notebook ${path} is not open`);
    }

    // Create and execute a new cell (waitSnippet handles both)
    const result = await worker.waitSnippet(index, code);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              cell_id: result.cell_id,
              output: result.output,
              runtime: result.runtime,
              errored: result.errored,
              message: "Cell created and executed successfully",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async editCell(
    path: string,
    cellId: string,
    code: string,
    run: boolean = true
  ): Promise<any> {
    if (!this.plutoManager.isConnected()) {
      throw new Error("Pluto server is not running");
    }

    const worker = await this.plutoManager.getWorker(path);

    if (!worker) {
      throw new Error(`Notebook ${path} is not open`);
    }

    let result = null;

    if (run) {
      // Execute the cell with new code using PlutoManager
      result = await this.plutoManager.executeCell(worker, cellId, code);
    } else {
      // Just update the code without running
      await worker.updateSnippetCode(cellId, code, false);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              cell_id: cellId,
              output: result?.output,
              runtime: result?.runtime,
              errored: result?.errored,
              message: run ? "Cell updated and executed successfully" : "Cell code updated (not executed)",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async readCell(path: string, cellId: string): Promise<any> {
    if (!this.plutoManager.isConnected()) {
      throw new Error("Pluto server is not running");
    }

    const worker = await this.plutoManager.getWorker(path);

    if (!worker) {
      throw new Error(`Notebook ${path} is not open`);
    }

    // Get the cell data
    const cellData = worker.getSnippet(cellId);

    if (!cellData) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: `Cell ${cellId} not found`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              cell_id: cellId,
              code: cellData.input.code,
              output: cellData.results.output,
              runtime: cellData.results.runtime,
              errored: cellData.results.errored,
              running: cellData.results.running,
              queued: cellData.results.queued,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getStatus(): Promise<any> {
    const isConnected = this.plutoManager.isConnected();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              server_running: isConnected,
              message: isConnected
                ? "Pluto server is running"
                : "Pluto server is not running",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async cleanup(): Promise<void> {
    console.error("[MCP] Cleaning up...");
    if (this.plutoManager.isRunning()) {
      await this.plutoManager.stop();
    }
    this.plutoManager.dispose();
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("[MCP] Pluto Notebook MCP Server running on stdio");
  }
}

const server = new PlutoMCPServer();
server.run().catch(console.error);
