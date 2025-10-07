import * as vscode from "vscode";
import { PlutoNotebookSerializer } from "./serializer.ts";
import { PlutoNotebookController } from "./controller.ts";
import {
  registerAllCommands,
  initializePlutoServer,
} from "./commands/index.ts";
import { getSharedPlutoManager } from "./shared/plutoManagerInstance.ts";
import {
  initializeMCPServer,
  startMCPServer,
  stopMCPServer,
  cleanupMCPServer,
} from "./mcp-server-http.ts";

export async function activate(context: vscode.ExtensionContext) {
  // Create output channels
  const serverOutputChannel = vscode.window.createOutputChannel("Pluto Server");
  const controllerOutputChannel =
    vscode.window.createOutputChannel("Pluto Controller");
  context.subscriptions.push(serverOutputChannel, controllerOutputChannel);

  serverOutputChannel.appendLine("Pluto Notebook extension is now active!");

  // Get port from configuration
  const config = vscode.workspace.getConfiguration("pluto-notebook");
  const plutoPort = config.get<number>("port", 1234);
  const mcpPort = config.get<number>("mcpPort", 3100);
  const autoStartMcp = config.get<boolean>("autoStartMcpServer", true);

  // Initialize shared Pluto Manager
  const plutoManager = getSharedPlutoManager(plutoPort, {
    appendLine: serverOutputChannel.appendLine.bind(serverOutputChannel),
    showWarningMessage: vscode.window.showWarningMessage,
  });
  context.subscriptions.push(plutoManager);

  // Initialize HTTP MCP Server using the shared PlutoManager (singleton)
  initializeMCPServer(plutoManager, mcpPort, serverOutputChannel);

  // Auto-start MCP server if configured
  if (autoStartMcp) {
    await startMCPServer(serverOutputChannel);
  }

  // Ensure MCP server is stopped and cleaned up when extension deactivates
  context.subscriptions.push({
    dispose: async () => {
      await stopMCPServer();
      cleanupMCPServer();
    },
  });

  // Start Pluto server on activation
  await initializePlutoServer(plutoManager, serverOutputChannel);

  // Register the notebook serializer
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      "pluto-notebook",
      new PlutoNotebookSerializer()
    )
  );

  // Register the notebook controller
  const controller = new PlutoNotebookController(
    plutoManager,
    controllerOutputChannel
  );
  context.subscriptions.push(controller);

  // Initialize workers when notebooks are opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenNotebookDocument(async (notebook) => {
      await controller.registerNotebookDocument(notebook);
    })
  );

  // Handle notebook cell changes (add/delete cells)
  context.subscriptions.push(
    vscode.workspace.onDidChangeNotebookDocument(async (event) => {
      await controller.handleVsCodeNotebookChange(event);
    })
  );

  // Register all commands
  registerAllCommands(context, plutoManager);
}

export function deactivate() {}
