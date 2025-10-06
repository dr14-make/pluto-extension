import * as vscode from "vscode";
import { PlutoManager } from "./plutoManager.ts";
import { UpdateEvent } from "@plutojl/rainbow";
import { formatCellOutput } from "./serializer.ts";

// --- START: Merged Interfaces ---

/** A unique identifier for a cell, typically a UUID string. */
type CellId = string;

/** An RFC 6902 JSON Patch operation. */
interface Patch {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: (string | number)[];
  value?: any;
  from?: (string | number)[];
}
// --- END: Merged Interfaces ---

export class PlutoNotebookController {
  readonly controllerId = "pluto-notebook-controller";
  readonly notebookType = "pluto-notebook";
  readonly label = "Pluto Notebook";
  readonly supportedLanguages = ["julia"];
  private readonly controller: vscode.NotebookController;
  // Map to store Pluto notebook ID to VS Code URI (only used for the worker lookup)
  // Map to track active VS Code execution objects for streaming updates
  private activeExecutions: Map<CellId, vscode.NotebookCellExecution> =
    new Map();
  // Renderer messaging API
  private rendererMessaging?: vscode.NotebookRendererMessaging;

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
    const worker = await this.plutoManager.getWorker(notebook.uri.fsPath);
    if (worker) {
      try {
        // Find all currently running executions and mark them as failed
        for (const [cellId, execution] of this.activeExecutions.entries()) {
          execution.end(false, Date.now());
          this.activeExecutions.delete(cellId);
        }

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

    // Setup messaging bridge between controller and renderer
    this.setupMessaging();
  }

  /**
   * Setup communication bridge between controller and renderer
   */
  private setupMessaging(): void {
    // Create messaging API for communicating with the renderer
    this.rendererMessaging = vscode.notebooks.createRendererMessaging(
      "pluto-output-renderer"
    );

    // Listen for messages from the renderer (PlutoOutput component)
    this.rendererMessaging.onDidReceiveMessage((event) => {
      this.handleRendererMessage(event);
    });
  }

  /**
   * Handle messages received from the renderer
   */
  private async handleRendererMessage(event: {
    editor: vscode.NotebookEditor;
    message: any;
  }): Promise<void> {
    const { editor, message } = event;

    this.outputChannel.appendLine(
      `[RENDERER MESSAGE] Received: ${JSON.stringify(message)}`
    );

    // Placeholder: Handle different message types from renderer
    switch (message.type) {
      case "bond":
        const worker = await this.plutoManager.getWorker(editor.notebook.uri);
        await worker?.setBond(message.name, message.value);
        this.outputChannel.appendLine(
          `[RENDERER MESSAGE] Bond set${message.name}=${message.value}!`
        );
        break;
      default:
        this.outputChannel.appendLine(`[UNKNOWN MESSAGE TYPE] ${message.type}`);
    }
  }

  /**
   * Send a message to the renderer for a specific notebook
   */
  sendMessageToRenderer(notebook: vscode.NotebookDocument, message: any): void {
    // Find the active editor for this notebook
    const editor = vscode.window.visibleNotebookEditors.find(
      (e) => e.notebook === notebook
    );

    if (editor && this.rendererMessaging) {
      this.rendererMessaging.postMessage(message, editor);
      this.outputChannel.appendLine(
        `[CONTROLLER MESSAGE] Sent: ${JSON.stringify(message)}`
      );
    }
  }

  /**
   * Finds the VS Code cell associated with a Pluto cell ID.
   */
  private getCellByPlutoId(
    notebook: vscode.NotebookDocument,
    plutoCellId: CellId
  ): vscode.NotebookCell | undefined {
    for (const cell of notebook.getCells()) {
      const cellId = cell.metadata?.pluto_cell_id as string;
      if (cellId === plutoCellId) {
        return cell;
      }
    }
    return undefined;
  }

  startExecution(
    cellId: CellId,
    notebook: vscode.NotebookDocument
  ): vscode.NotebookCellExecution {
    let execution = this.activeExecutions.get(cellId);
    if (!execution) {
      this.outputChannel.appendLine(
        `[EXEC INIT] Starting initial execution for cell ${cellId}`
      );
      const notebookCell = this.getCellByPlutoId(notebook, cellId);
      if (!notebookCell) {
        throw new Error("Can not determine notebook cell");
      }
      execution = this.controller.createNotebookCellExecution(notebookCell);
      this.activeExecutions.set(cellId, execution);
      execution.start(Date.now());
    }
    return execution;
  }
  /**
   * Handles cell-specific patch updates (execution status, output, logs).
   */
  private _handleCellPatch(
    notebook: vscode.NotebookDocument,
    patch: Patch,
    fullNotebookState: any
  ) {
    const path = patch.path;
    const cellId = path[1] as CellId;

    const currentCellState = fullNotebookState.cell_results[cellId];
    const segment2 = path[2];

    // 1. Update Cell Execution Status (queued, running)
    const isStarting = patch.value === true && segment2 === "running";

    if (isStarting) {
      // Start execution
      this.startExecution(cellId, notebook);
    }

    // 2. Update Cell Output (only if an execution object exists)
    if (segment2 === "output") {
      // Handle final output/result update
      const execution = this.startExecution(cellId, notebook);
      if (currentCellState?.output) {
        execution.replaceOutput([formatCellOutput(currentCellState.output)]);
        this.outputChannel.appendLine(
          `[OUTPUT] Cell ${cellId} output updated.`
        );
      }
      execution.end(true, Date.now());
      this.activeExecutions.delete(cellId);
      this.outputChannel.appendLine(`[EXEC END] Cell ${cellId} finished.`);
    } else if (segment2 === "logs") {
      // Handle streaming logs (logs are added, path.length === 4, or array is cleared)
      if (patch.op === "add" && path.length === 4 && currentCellState?.logs) {
        const lastLog = currentCellState.logs[currentCellState.logs.length - 1];
        if (lastLog) {
          // Log the raw event to the output channel
          this.outputChannel.appendLine(
            `[CELL LOG] ${cellId}: ${lastLog.msg.join("")}`
          );
          // A proper implementation would update the cell's log output here.
        }
      }
    }

    // 3. Update Cell Metadata/Runtime
    if (segment2 === "runtime") {
      this.outputChannel.appendLine(
        `[UpdateMetadata] Cell ${cellId} runtime recorded: ${patch.value} ns`
      );
    }
  }

  /**
   * Handles streaming updates from the Pluto worker via patches.
   */
  private onNotebookUpdate = (notebook: vscode.NotebookDocument) => {
    return (event: UpdateEvent) => {
      try {
        const patches = (event.data as any)?.patches as Patch[] | undefined;
        const fullNotebookState = (event.data as any)?.notebook;

        if (!patches || !fullNotebookState) {
          this.outputChannel.appendLine(
            `Received non-patch update or missing state: ${event.type}`
          );
          return;
        }

        for (const patch of patches) {
          const path = patch.path;
          const [segment0, segment1] = path;

          if (segment0 === "cell_results" && typeof segment1 === "string") {
            // --- Cell-Specific Update ---
            this._handleCellPatch(notebook, patch, fullNotebookState);
          } else if (segment0 === "process_status" && path.length === 1) {
            // --- Global Kernel Status Update ---
            this.outputChannel.appendLine(
              `[UpdateKernelStatus] Kernel process status changed to: ${patch.value}`
            );
            vscode.window.showInformationMessage(
              `Pluto Kernel status: ${patch.value}`
            );
          } else if (segment0 === "nbpkg") {
            // --- Package Management Status ---
            this.outputChannel.appendLine(
              `[LogInternal] Package environment setting changed: ${segment1} = ${patch.value}`
            );
          } else if (
            segment0 === "status_tree" ||
            segment0 === "last_save_time"
          ) {
            // --- Internal Metadata/Status Tree Update ---
            this.outputChannel.appendLine(
              `[LogInternal] Internal status updated: /${path.join("/")}`
            );
          } else {
            // --- Fallback ---
            this.outputChannel.appendLine(
              `[LogInternal] Unrecognized patch path. Op: ${
                patch.op
              } Path: /${path.join("/")}`
            );
          }
        }
      } catch (e: any) {
        this.outputChannel.appendLine(
          `Failed to process patch update: ${e.message}`
        );
      }
    };
  };

  async registerNotebookDocument(notebook: vscode.NotebookDocument) {
    if (notebook.notebookType === "pluto-notebook") {
      this.outputChannel.appendLine(`Notebook opened: ${notebook.uri.fsPath}`);

      // Only initialize if server is running
      if (this.plutoManager.isRunning()) {
        try {
          const worker = await this.plutoManager.getWorker(notebook.uri.fsPath);
          if (worker) {
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
    // NotebookRendererMessaging doesn't have a dispose method
    this.plutoManager.dispose();
  }

  private async _doExecution(
    cell: vscode.NotebookCell,
    notebook: vscode.NotebookDocument
  ): Promise<void> {
    // Execution lifecycle is now managed by the streaming patches in onNotebookUpdate.
    // Here, we just submit the job and the streaming updates will handle start/end/output.
    // If an execution is already active, reuse it, otherwise create a placeholder.

    const cellId = cell.metadata?.pluto_cell_id as string;
    if (!cellId) {
      vscode.window.showErrorMessage(`Cell missing Pluto cell ID`);
      return;
    }

    // Ensure there is at least an initial execution object for this cell
    let execution = this.startExecution(cellId, notebook);

    try {
      if (!this.plutoManager.isRunning()) {
        throw new Error(
          "Pluto server is not running. Please start the server first."
        );
      }

      const worker = await this.plutoManager.getWorker(notebook.uri.fsPath);

      if (!worker) {
        throw new Error(`Failed to initialize Pluto worker.`);
      }

      // Execute the cell. This sends the message to the Pluto kernel.
      const code = cell.document.getText();

      // The worker will handle the execution and stream updates back via onNotebookUpdate.
      await this.plutoManager.executeCell(worker, cellId, code);

      // We do NOT call execution.end() here. The `onNotebookUpdate` listener
      // will handle `execution.end()` when it receives the final 'running: false' patch.
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`Error executing cell: ${errorMessage}`);

      // If an error occurred BEFORE even talking to the kernel, we end the execution immediately.
      execution?.replaceOutput([
        new vscode.NotebookCellOutput([
          vscode.NotebookCellOutputItem.error(error as Error),
        ]),
      ]);
      execution?.end(false, Date.now());
      this.activeExecutions.delete(cellId);

      // Show error notification for critical failures
      if (errorMessage.includes("server") || errorMessage.includes("worker")) {
        vscode.window.showErrorMessage(
          `Cell execution failed: ${errorMessage}`
        );
      }
    }
  }
}
