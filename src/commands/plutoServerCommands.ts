import * as vscode from "vscode";
import { PlutoManager } from "../plutoManager.ts";

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
