import * as vscode from "vscode";
import { PlutoNotebookSerializer } from "./serializer.ts";
import { PlutoNotebookController } from "./controller.ts";
import { PlutoManager } from "./plutoManager.ts";

export function activate(context: vscode.ExtensionContext) {
  console.log("Pluto Notebook extension is now active!");

  // Create output channel for Pluto Notebook
  const outputChannel = vscode.window.createOutputChannel("Pluto Notebook");
  context.subscriptions.push(outputChannel);

  // Get port from configuration
  const config = vscode.workspace.getConfiguration("pluto-notebook");
  const port = config.get<number>("port", 1234);

  // Initialize Pluto Manager
  const plutoManager = new PlutoManager(port, outputChannel);
  context.subscriptions.push(plutoManager);

  // Start Pluto server
  plutoManager.start().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Failed to start Pluto server: ${errorMessage}`,
    );
  });

  // Register the notebook serializer
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      "pluto-notebook",
      new PlutoNotebookSerializer(),
    ),
  );

  // Register the notebook controller
  const controller = new PlutoNotebookController(plutoManager);
  context.subscriptions.push(controller);

  // Keep the hello world command for testing
  const disposable = vscode.commands.registerCommand(
    "pluto-notebook.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from Pluto Notebook!");
    },
  );
  context.subscriptions.push(disposable);

  // Register server control commands
  context.subscriptions.push(
    vscode.commands.registerCommand("pluto-notebook.startServer", async () => {
      try {
        await plutoManager.start();
        vscode.window.showInformationMessage("Pluto server started");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `Failed to start Pluto server: ${errorMessage}`,
        );
      }
    }),
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
          `Failed to stop Pluto server: ${errorMessage}`,
        );
      }
    }),
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
            `Failed to restart Pluto server: ${errorMessage}`,
          );
        }
      },
    ),
  );
}

export function deactivate() {}
