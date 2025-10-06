import * as vscode from "vscode";
import { PlutoManager } from "./plutoManager.ts";

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
 * Generate MCP server configuration object
 */
function getMCPJson(mcpServerPath: string): object {
  return {
    mcpServers: {
      "pluto-notebook": {
        command: "node",
        args: [mcpServerPath],
      },
    },
  };
}

/**
 * Create or update .mcp.json in the current workspace
 */
async function createProjectMCPConfig(extensionPath: string): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open");
    return;
  }

  const workspaceFolder = workspaceFolders[0];
  const mcpConfigPath = vscode.Uri.joinPath(workspaceFolder.uri, ".mcp.json");
  const mcpServerPath = `${extensionPath}/dist/mcp-server.cjs`;

  try {
    // Try to read existing config
    let existingConfig: any = { mcpServers: {} };

    try {
      const existingContent = await vscode.workspace.fs.readFile(mcpConfigPath);
      existingConfig = JSON.parse(new TextDecoder().decode(existingContent));
    } catch (error) {
      // File doesn't exist, use default empty config
    }

    // Update or add pluto-notebook server
    if (!existingConfig.mcpServers) {
      existingConfig.mcpServers = {};
    }

    const mcpConfig = getMCPJson(mcpServerPath) as any;
    existingConfig.mcpServers["pluto-notebook"] =
      mcpConfig.mcpServers["pluto-notebook"];

    // Write the config file
    const configContent = JSON.stringify(existingConfig, null, 2);
    await vscode.workspace.fs.writeFile(
      mcpConfigPath,
      new TextEncoder().encode(configContent)
    );

    // Open the file
    const doc = await vscode.workspace.openTextDocument(mcpConfigPath);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
      `MCP config created/updated at ${mcpConfigPath.fsPath}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Failed to create MCP config: ${errorMessage}`
    );
  }
}

/**
 * Command: Get MCP server path with options
 */
export function registerGetMCPServerPathCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.getMCPServerPath",
      async () => {
        const extensionPath = context.extensionPath;
        const mcpServerPath = `${extensionPath}/dist/mcp-server.cjs`;

        const action = await vscode.window.showInformationMessage(
          `MCP Server Path: ${mcpServerPath}`,
          "Copy Path",
          "Show Config Example",
          "Create Project Config"
        );

        if (action === "Copy Path") {
          await vscode.env.clipboard.writeText(mcpServerPath);
          vscode.window.showInformationMessage("Path copied to clipboard!");
        } else if (action === "Show Config Example") {
          const mcpConfig = getMCPJson(mcpServerPath);
          const configExample = JSON.stringify(mcpConfig, null, 2);

          const doc = await vscode.workspace.openTextDocument({
            content: configExample,
            language: "json",
          });
          await vscode.window.showTextDocument(doc);
        } else if (action === "Create Project Config") {
          await createProjectMCPConfig(context.extensionPath);
        }
      }
    )
  );
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
        await createProjectMCPConfig(context.extensionPath);
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
  registerGetMCPServerPathCommand(context);
  registerCreateProjectMCPConfigCommand(context);
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
