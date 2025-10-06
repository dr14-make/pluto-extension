import * as vscode from "vscode";
import { PlutoNotebookSerializer } from "./serializer.ts";
import { PlutoNotebookController } from "./controller.ts";
import { PlutoManager } from "./plutoManager.ts";
import { registerAllCommands, initializePlutoServer } from "./commands.ts";

export async function activate(context: vscode.ExtensionContext) {
  // Create output channels
  const serverOutputChannel = vscode.window.createOutputChannel("Pluto Server");
  const controllerOutputChannel =
    vscode.window.createOutputChannel("Pluto Controller");
  context.subscriptions.push(serverOutputChannel, controllerOutputChannel);

  serverOutputChannel.appendLine("Pluto Notebook extension is now active!");

  // Get port from configuration
  const config = vscode.workspace.getConfiguration("pluto-notebook");
  const port = config.get<number>("port", 1234);

  // Initialize Pluto Manager
  const plutoManager = new PlutoManager(port, {
    appendLine: serverOutputChannel.appendLine.bind(serverOutputChannel),
    showWarningMessage: vscode.window.showWarningMessage,
  });
  context.subscriptions.push(plutoManager);

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

  // Register all commands
  registerAllCommands(context, plutoManager);
}

export function deactivate() {}
