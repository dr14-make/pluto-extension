import * as vscode from "vscode";
import { PlutoManager } from "../plutoManager.ts";

async function revealNotebook(notebookPath: string) {
  const uri = vscode.Uri.file(notebookPath);
  const notebookDocument = await vscode.workspace.openNotebookDocument(uri);
  await vscode.window.showNotebookDocument(notebookDocument, {
    preview: false,
  });
  return notebookDocument;
}
/**
 * Register command to open notebook from tree
 */
export function revealNotebookCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.openNotebookFromTree",
      async (notebookPath: string) => {
        try {
          await revealNotebook(notebookPath);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to open notebook: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    )
  );
}

/**
 * Register command to focus cell from tree
 */
export function registerFocusCellCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.focusCellFromTree",
      async (notebookPath: string, cellId: string) => {
        try {
          // Open the notebook document
          const document = await revealNotebook(notebookPath);

          // Find the cell with matching pluto_cell_id
          const cells = document.getCells();
          const cellIndex = cells.findIndex(
            (cell) => cell.metadata?.pluto_cell_id === cellId
          );

          if (cellIndex !== -1) {
            // Focus the cell by selecting it
            const editor = vscode.window.activeNotebookEditor;
            if (editor) {
              editor.selection = new vscode.NotebookRange(
                cellIndex,
                cellIndex + 1
              );
              // Reveal the cell
              editor.revealRange(
                new vscode.NotebookRange(cellIndex, cellIndex + 1),
                vscode.NotebookEditorRevealType.InCenter
              );
            }
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to focus cell: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    )
  );
}

/**
 * Register refresh command
 */

/**
 * Register reconnect notebook command
 */
export function registerReconnectCommand(
  context: vscode.ExtensionContext,

  plutoManager: PlutoManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.reconnectNotebook",
      async (notebookPath: string) => {
        try {
          // Close existing worker
          plutoManager.closeNotebook(notebookPath);

          // Wait a bit for cleanup
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Recreate worker
          await plutoManager.getWorker(notebookPath);

          vscode.window.showInformationMessage(
            `Reconnected to notebook: ${notebookPath.split("/").pop()}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to reconnect notebook: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    )
  );
}
