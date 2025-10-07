import * as vscode from "vscode";
import { PlutoManager } from "./plutoManager.ts";
import { getMCPServer } from "./mcp-server-http.ts";

/**
 * Start Pluto server with progress notification
 */
async function startServerWithProgress(
  plutoManager: PlutoManager,
  message: string = "Pluto server is ready"
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Starting Pluto server...",
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: "Launching Julia process..." });
        await plutoManager.start();
        progress.report({ message: "Server started successfully!" });
        vscode.window.showInformationMessage(message);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `Failed to start Pluto server: ${errorMessage}`
        );
        throw error;
      }
    }
  );
}

/**
 * Command: Start Pluto server
 */
export function registerStartServerCommand(
  context: vscode.ExtensionContext,
  plutoManager: PlutoManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("pluto-notebook.startServer", async () => {
      await startServerWithProgress(plutoManager, "Pluto server started");
    })
  );
}

/**
 * Command: Stop Pluto server
 */
export function registerStopServerCommand(
  context: vscode.ExtensionContext,
  plutoManager: PlutoManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("pluto-notebook.stopServer", async () => {
      try {
        await plutoManager.stop();
        vscode.window.showInformationMessage("Pluto server stopped");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `Failed to stop Pluto server: ${errorMessage}`
        );
      }
    })
  );
}

/**
 * Command: Restart Pluto server
 */
export function registerRestartServerCommand(
  context: vscode.ExtensionContext,
  plutoManager: PlutoManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.restartServer",
      async () => {
        try {
          await plutoManager.restart();
          vscode.window.showInformationMessage("Pluto server restarted");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(
            `Failed to restart Pluto server: ${errorMessage}`
          );
        }
      }
    )
  );
}

/**
 * Generate MCP server configuration for Claude Desktop
 */
function getClaudeConfig(mcpUrl: string): object {
  return {
    mcpServers: {
      "pluto-notebook": {
        url: mcpUrl,
        transport: "sse",
      },
    },
  };
}

/**
 * Generate MCP server configuration for GitHub Copilot
 */
function getCopilotConfig(mcpUrl: string): object {
  return {
    "github.copilot.chat.mcp.servers": {
      "pluto-notebook": {
        url: mcpUrl,
      },
    },
  };
}

/**
 * Create or update MCP config in the current workspace
 */
async function createProjectMCPConfig(
  mcpUrl: string,
  configType: "claude" | "copilot"
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open");
    return;
  }

  const workspaceFolder = workspaceFolders[0];
  const configFileName =
    configType === "claude" ? "claude_desktop_config.json" : ".vscode/settings.json";
  const configPath = vscode.Uri.joinPath(workspaceFolder.uri, configFileName);

  try {
    // For Copilot, ensure .vscode directory exists
    if (configType === "copilot") {
      const vscodeDir = vscode.Uri.joinPath(workspaceFolder.uri, ".vscode");
      try {
        await vscode.workspace.fs.createDirectory(vscodeDir);
      } catch (error) {
        // Directory might already exist
      }
    }

    // Try to read existing config
    let existingConfig: any = {};

    try {
      const existingContent = await vscode.workspace.fs.readFile(configPath);
      existingConfig = JSON.parse(new TextDecoder().decode(existingContent));
    } catch (error) {
      // File doesn't exist, use default empty config
    }

    // Merge configurations
    const newConfig =
      configType === "claude"
        ? getClaudeConfig(mcpUrl)
        : getCopilotConfig(mcpUrl);

    if (configType === "claude") {
      if (!existingConfig.mcpServers) {
        existingConfig.mcpServers = {};
      }
      existingConfig.mcpServers["pluto-notebook"] = (newConfig as any).mcpServers[
        "pluto-notebook"
      ];
    } else {
      if (!existingConfig["github.copilot.chat.mcp.servers"]) {
        existingConfig["github.copilot.chat.mcp.servers"] = {};
      }
      existingConfig["github.copilot.chat.mcp.servers"]["pluto-notebook"] = (
        newConfig as any
      )["github.copilot.chat.mcp.servers"]["pluto-notebook"];
    }

    // Write the config file
    const configContent = JSON.stringify(existingConfig, null, 2);
    await vscode.workspace.fs.writeFile(
      configPath,
      new TextEncoder().encode(configContent)
    );

    // Open the file
    const doc = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
      `${configType === "claude" ? "Claude Desktop" : "Copilot"} config created/updated at ${configPath.fsPath}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Failed to create MCP config: ${errorMessage}`
    );
  }
}

/**
 * Command: Create MCP config for current project
 */
export function registerCreateProjectMCPConfigCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.createProjectMCPConfig",
      async () => {
        const config = vscode.workspace.getConfiguration("pluto-notebook");
        const mcpPort = config.get<number>("mcpPort", 3100);
        const mcpUrl = `http://localhost:${mcpPort}/mcp`;

        const choice = await vscode.window.showQuickPick(
          [
            {
              label: "Claude Desktop",
              description: "Create config for Claude Desktop (claude_desktop_config.json)",
              value: "claude" as const,
            },
            {
              label: "GitHub Copilot",
              description: "Create config for GitHub Copilot (.vscode/settings.json)",
              value: "copilot" as const,
            },
          ],
          {
            placeHolder: "Select which tool to configure",
          }
        );

        if (choice) {
          await createProjectMCPConfig(mcpUrl, choice.value);
        }
      }
    )
  );
}

/**
 * Command: Get MCP HTTP Server URL
 */
export function registerGetMCPHttpUrlCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.getMCPHttpUrl",
      async () => {
        const config = vscode.workspace.getConfiguration("pluto-notebook");
        const mcpPort = config.get<number>("mcpPort", 3100);
        const mcpUrl = `http://localhost:${mcpPort}/mcp`;

        const action = await vscode.window.showInformationMessage(
          `MCP HTTP Server URL: ${mcpUrl}`,
          "Copy URL",
          "Create Claude Config",
          "Create Copilot Config",
          "Open Health Check"
        );

        if (action === "Copy URL") {
          await vscode.env.clipboard.writeText(mcpUrl);
          vscode.window.showInformationMessage("URL copied to clipboard!");
        } else if (action === "Create Claude Config") {
          await createProjectMCPConfig(mcpUrl, "claude");
        } else if (action === "Create Copilot Config") {
          await createProjectMCPConfig(mcpUrl, "copilot");
        } else if (action === "Open Health Check") {
          const healthUrl = `http://localhost:${mcpPort}/health`;
          await vscode.env.openExternal(vscode.Uri.parse(healthUrl));
        }
      }
    )
  );
}

/**
 * Command: Start MCP Server
 */
export function registerStartMCPServerCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.startMCPServer",
      async () => {
        const mcpServer = getMCPServer();

        if (!mcpServer) {
          vscode.window.showErrorMessage("MCP server is not initialized");
          return;
        }

        if (mcpServer.isRunning()) {
          vscode.window.showInformationMessage("MCP server is already running");
          return;
        }

        try {
          const config = vscode.workspace.getConfiguration("pluto-notebook");
          const mcpPort = config.get<number>("mcpPort", 3100);

          await mcpServer.start();
          vscode.window.showInformationMessage(
            `MCP Server started on http://localhost:${mcpPort}`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(
            `Failed to start MCP server: ${errorMessage}`
          );
        }
      }
    )
  );
}

/**
 * Command: Stop MCP Server
 */
export function registerStopMCPServerCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.stopMCPServer",
      async () => {
        const mcpServer = getMCPServer();

        if (!mcpServer) {
          vscode.window.showErrorMessage("MCP server is not initialized");
          return;
        }

        if (!mcpServer.isRunning()) {
          vscode.window.showInformationMessage("MCP server is not running");
          return;
        }

        try {
          await mcpServer.stop();
          vscode.window.showInformationMessage("MCP Server stopped");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(
            `Failed to stop MCP server: ${errorMessage}`
          );
        }
      }
    )
  );
}

/**
 * Command: Restart MCP Server
 */
export function registerRestartMCPServerCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.restartMCPServer",
      async () => {
        const mcpServer = getMCPServer();

        if (!mcpServer) {
          vscode.window.showErrorMessage("MCP server is not initialized");
          return;
        }

        try {
          if (mcpServer.isRunning()) {
            await mcpServer.stop();
          }

          const config = vscode.workspace.getConfiguration("pluto-notebook");
          const mcpPort = config.get<number>("mcpPort", 3100);

          await mcpServer.start();
          vscode.window.showInformationMessage(
            `MCP Server restarted on http://localhost:${mcpPort}`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(
            `Failed to restart MCP server: ${errorMessage}`
          );
        }
      }
    )
  );
}

/**
 * Register all commands
 */
export function registerAllCommands(
  context: vscode.ExtensionContext,
  plutoManager: PlutoManager
): void {
  registerStartServerCommand(context, plutoManager);
  registerStopServerCommand(context, plutoManager);
  registerRestartServerCommand(context, plutoManager);
  registerStartMCPServerCommand(context);
  registerStopMCPServerCommand(context);
  registerRestartMCPServerCommand(context);
  registerCreateProjectMCPConfigCommand(context);
  registerGetMCPHttpUrlCommand(context);
}

/**
 * Initialize Pluto server on activation (exported for use in extension.ts)
 */
export async function initializePlutoServer(
  plutoManager: PlutoManager,
  serverOutputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    await startServerWithProgress(plutoManager);
  } catch (error) {
    // Continue activation even if server fails to start
    // Users can manually start the server later
    serverOutputChannel.appendLine(
      "Extension activated but server failed to start. Use 'Start Server' command to retry."
    );
  }
}
