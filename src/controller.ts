import * as vscode from "vscode";
import { PlutoManager } from "./plutoManager.ts";
import { UpdateEvent } from "@plutojl/rainbow";
import { formatCellOutput } from "./serializer.ts";

export class PlutoNotebookController {
  readonly controllerId = "pluto-notebook-controller";
  readonly notebookType = "pluto-notebook";
  readonly label = "Pluto Notebook";
  readonly supportedLanguages = ["julia"];
  private readonly controller: vscode.NotebookController;
  private _executionOrder = 0;
  private plutoNotebookMap: Map<string, vscode.Uri> = new Map();
  private executeHandler = (
    cells: vscode.NotebookCell[],
    notebook: vscode.NotebookDocument,
    controller: vscode.NotebookController
  ): void | Thenable<void> => {
    for (const cell of cells) {
      this._doExecution(cell, notebook);
    }
  };

  private interruptHandler = async (notebook: vscode.NotebookDocument) => {
    const worker = await this.plutoManager.getWorker(notebook.uri);
    if (worker) {
      try {
        await worker.interrupt();
        vscode.window.showInformationMessage("Notebook execution interrupted");
      } catch (error) {
        this.outputChannel.appendLine(`Error interrupting notebook: ${error}`);
        vscode.window.showErrorMessage("Failed to interrupt execution");
      }
    }
  };

  constructor(
    private readonly plutoManager: PlutoManager,
    private readonly outputChannel: vscode.OutputChannel
  ) {
    this.controller = vscode.notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label
    );

    this.controller.supportedLanguages = this.supportedLanguages;
    this.controller.supportsExecutionOrder = true;
    this.controller.executeHandler = this.executeHandler;
    this.controller.interruptHandler = this.interruptHandler;
  }

  private onNotebookUpdate = (notebook: vscode.NotebookDocument) => {
    return (event: UpdateEvent) => {
      this.outputChannel.appendLine(
        // TODO HERE WE NEED SOMEHOW TO UPDATE THE STATE OF ALL THE CELLS
        `Update event: ${notebook.uri} ${event.type}`
      );

      // if (event.notebook) {
      //   const order = event.notebook.cell_order
      //   for (let index = 0; index < array.length; index++) {
      //     const element = array[index];
      //     for( const cellId of event.notebook.cell_order) {

      //     }
      //   }
      // }
      // const cells = notebook.getCells();
      // for (const cell of cells) {
      //   cell
      //   // this._doExecution(cell, notebook);
      // }
    };
  };

  async registerNotebookDocument(notebook: vscode.NotebookDocument) {
    if (notebook.notebookType === "pluto-notebook") {
      this.outputChannel.appendLine(`Notebook opened: ${notebook.uri.fsPath}`);

      // Only initialize if server is running
      if (this.plutoManager.isRunning()) {
        try {
          const worker = await this.plutoManager.getWorker(notebook.uri);
          if (worker) {
            this.plutoNotebookMap.set(worker.notebook_id, notebook.uri);

            this.outputChannel.appendLine(
              `Worker initialized for: ${notebook.uri.fsPath}`
            );

            // Subscribe to updates from this worker
            worker.onUpdate(this.onNotebookUpdate(notebook));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.outputChannel.appendLine(
            `Failed to initialize worker: ${errorMessage}`
          );
          vscode.window.showErrorMessage(
            `Failed to initialize Pluto notebook: ${errorMessage}`
          );
        }
      } else {
        this.outputChannel.appendLine(
          "Server not running - worker will be initialized on first execution"
        );
      }
    }
  }
  dispose(): void {
    this.controller.dispose();
    this.plutoManager.dispose();
  }

  private async _doExecution(
    cell: vscode.NotebookCell,
    notebook: vscode.NotebookDocument
  ): Promise<void> {
    const execution = this.controller.createNotebookCellExecution(cell);
    execution.executionOrder = ++this._executionOrder;
    execution.start(Date.now());

    try {
      // Check if server is running
      if (!this.plutoManager.isRunning()) {
        throw new Error(
          "Pluto server is not running. Please start the server first."
        );
      }

      // Get worker for this notebook (should already exist from onDidOpenNotebookDocument)
      const worker = await this.plutoManager.getWorker(notebook.uri);

      if (!worker) {
        vscode.window.showErrorMessage(
          `Failed to initialize Pluto notebook: Failed to create worker`
        );
        return;
      }

      // Get cell ID from metadata
      const cellId = cell.metadata?.pluto_cell_id as string;
      if (!cellId) {
        vscode.window.showErrorMessage(
          `Failed to initialize Pluto notebook:Cell missing Pluto cell ID`
        );
        return;
      }

      // Execute the cell
      const code = cell.document.getText();
      const cellData = await this.plutoManager.executeCell(
        worker,
        cellId,
        code
      );

      // TODO WE need to wait how event use global events and some sort of map

      // Format and display output
      if (cellData) {
        const output = formatCellOutput(cellData);
        execution.replaceOutput([output]);
      } else {
        // No output or still running
        vscode.window.showInformationMessage(`Cell executed successfully`);
      }

      execution.end(true, Date.now());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`Error executing cell: ${errorMessage}`);

      execution.replaceOutput([
        new vscode.NotebookCellOutput([
          vscode.NotebookCellOutputItem.error(error as Error),
        ]),
      ]);
      execution.end(false, Date.now());

      // Show error notification for critical failures
      if (errorMessage.includes("server") || errorMessage.includes("worker")) {
        vscode.window.showErrorMessage(
          `Cell execution failed: ${errorMessage}`
        );
      }
    }
  }
}
