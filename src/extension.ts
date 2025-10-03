import * as vscode from "vscode";
import { PlutoNotebookSerializer } from "./serializer.ts";
import { PlutoNotebookController } from "./controller.ts";
import { PlutoManager } from "./plutoManager.ts";
import { UpdateEvent } from "@plutojl/rainbow";

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
  const plutoManager = new PlutoManager(port, serverOutputChannel);
  context.subscriptions.push(plutoManager);

  // Start Pluto server on activation
  try {
    await startServerWithProgress(plutoManager);
  } catch (error) {
    // Continue activation even if server fails to start
    // Users can manually start the server later
    serverOutputChannel.appendLine(
      "Extension activated but server failed to start. Use 'Start Server' command to retry."
    );
  }

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

  // Keep the hello world command for testing
  const disposable = vscode.commands.registerCommand(
    "pluto-notebook.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from Pluto Notebook!");
    }
  );
  context.subscriptions.push(disposable);

  // Register server control commands
  context.subscriptions.push(
    vscode.commands.registerCommand("pluto-notebook.startServer", async () => {
      await startServerWithProgress(plutoManager, "Pluto server started");
    })
  );

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

export function deactivate() {}
