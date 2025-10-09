import * as vscode from "vscode";
import { PlutoManager } from "./plutoManager.ts";
import { NotebookData } from "@plutojl/rainbow";

/**
 * Tree item types
 */
enum TreeItemType {
  Notebook = "notebook",
  Cell = "cell",
}

/**
 * Tree item for notebooks and cells
 */
class NotebookTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: TreeItemType,
    public readonly notebookPath?: string,
    public readonly cellId?: string,
    public readonly cellCode?: string
  ) {
    super(label, collapsibleState);

    if (type === TreeItemType.Notebook) {
      this.contextValue = "plutoNotebook";
      this.iconPath = new vscode.ThemeIcon("notebook");
      this.tooltip = notebookPath;
      this.command = {
        command: "pluto-notebook.openNotebookFromTree",
        title: "Open Notebook",
        arguments: [notebookPath],
      };
    } else {
      this.contextValue = "plutoCell";
      this.iconPath = new vscode.ThemeIcon("symbol-field");
      this.tooltip = cellCode ? `${cellCode.substring(0, 100)}...` : cellId;
      this.command = {
        command: "pluto-notebook.focusCellFromTree",
        title: "Focus Cell",
        arguments: [notebookPath, cellId],
      };
    }
  }
}

/**
 * Tree data provider for Pluto notebooks
 */
export class NotebooksTreeDataProvider
  implements vscode.TreeDataProvider<NotebookTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    NotebookTreeItem | undefined | null | void
  > = new vscode.EventEmitter<NotebookTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    NotebookTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private serverStateListener: () => void;
  private notebookOpenedListener: (notebookPath: string) => void;
  private notebookClosedListener: (notebookPath: string) => void;
  private cellUpdatedListener: (notebookPath: string, cellId: string) => void;

  constructor(private plutoManager: PlutoManager) {
    // Listen to PlutoManager events
    this.serverStateListener = () => {
      this.refresh();
    };
    this.notebookOpenedListener = (notebookPath: string) => {
      this.refresh();
    };
    this.notebookClosedListener = (notebookPath: string) => {
      this.refresh();
    };
    this.cellUpdatedListener = (notebookPath: string, cellId: string) => {
      // Refresh the tree when cells are updated
      this.refresh();
    };

    this.plutoManager.on("serverStateChanged", this.serverStateListener);
    this.plutoManager.on("notebookOpened", this.notebookOpenedListener);
    this.plutoManager.on("notebookClosed", this.notebookClosedListener);
    this.plutoManager.on("cellUpdated", this.cellUpdatedListener);
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    console.log("[TreeView] Refreshing tree view");
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item
   */
  getTreeItem(element: NotebookTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for tree item
   */
  async getChildren(element?: NotebookTreeItem): Promise<NotebookTreeItem[]> {
    if (!element) {
      // Root level - show all open notebooks
      return this.getNotebooks();
    } else if (element.type === TreeItemType.Notebook) {
      // Show cells for this notebook
      return this.getCells(element.notebookPath!);
    }
    return [];
  }

  /**
   * Get all open notebooks
   */
  private async getNotebooks(): Promise<NotebookTreeItem[]> {
    const notebooks = this.plutoManager.getOpenNotebooks();

    console.log(`[TreeView] Found ${notebooks.length} open notebooks`);

    if (notebooks.length === 0) {
      return [];
    }

    return notebooks.map((notebook) => {
      const basename = notebook.path.split("/").pop() || notebook.path;

      // Determine notebook status icon
      let statusIcon = "$(circle-outline)";
      try {
        // Check if notebook is connected by trying to get worker
        const isConnected = this.plutoManager.isConnected();
        statusIcon = isConnected ? "$(check)" : "$(debug-disconnect)";
      } catch (error) {
        statusIcon = "$(error)";
      }

      const label = `${statusIcon} ${basename}`;

      const item = new NotebookTreeItem(
        label,
        vscode.TreeItemCollapsibleState.Expanded,
        TreeItemType.Notebook,
        notebook.path
      );

      console.log(`[TreeView] Created notebook item: ${label}`);
      return item;
    });
  }

  /**
   * Get all cells for a notebook
   */
  private async getCells(notebookPath: string): Promise<NotebookTreeItem[]> {
    try {
      console.log(`[TreeView] Getting cells for ${notebookPath}`);

      const worker = await this.plutoManager.getWorker(notebookPath);
      if (!worker) {
        console.log(`[TreeView] No worker found for ${notebookPath}`);
        return [];
      }

      // Get cell order from worker
      const notebookData: NotebookData = worker.getState();
      const cellOrder = notebookData.cell_order;
      if (!cellOrder || !Array.isArray(cellOrder)) {
        console.log(`[TreeView] Invalid cell_order, returning empty`);
        return [];
      }

      if (cellOrder.length === 0) {
        console.log(`[TreeView] No cells in cell_order`);
        return [];
      }

      console.log(`[TreeView] Found ${cellOrder.length} cells`);
      const cells: NotebookTreeItem[] = [];

      for (const cellId of cellOrder) {
        try {
          const cellData = worker.getSnippet(cellId);
          if (!cellData) {
            console.log(`[TreeView] No cell data for ${cellId}`);
            continue;
          }

          const cellResults = cellData.results;

          // Determine cell status icon
          let icon = "$(circle-outline)";

          if (cellResults.running) {
            icon = "$(sync~spin)"; // Running
          } else if (cellResults.queued) {
            icon = "$(watch)"; // Queued
          } else if (cellResults.errored) {
            icon = "$(error)"; // Error
          } else if (cellResults.output) {
            icon = "$(pass)"; // Success
          }

          // Create cell label
          const label = `${icon} ${cellId}"}`;

          cells.push(
            new NotebookTreeItem(
              label,
              vscode.TreeItemCollapsibleState.None,
              TreeItemType.Cell,
              notebookPath,
              cellId,
              code
            )
          );

          console.log(`[TreeView] Added cell: ${label}`);
        } catch (cellError) {
          console.error(
            `[TreeView] Error processing cell ${cellId}:`,
            cellError
          );
        }
      }

      console.log(`[TreeView] Returning ${cells.length} cells`);
      return cells;
    } catch (error) {
      console.error(
        `[TreeView] Failed to get cells for ${notebookPath}:`,
        error
      );
      return [];
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.plutoManager.off("serverStateChanged", this.serverStateListener);
    this.plutoManager.off("notebookOpened", this.notebookOpenedListener);
    this.plutoManager.off("notebookClosed", this.notebookClosedListener);
    this.plutoManager.off("cellUpdated", this.cellUpdatedListener);
  }
}

/**
 * Register tree view commands
 */
export function registerNotebooksTreeView(
  context: vscode.ExtensionContext,
  plutoManager: PlutoManager
): void {
  // Create tree data provider
  const treeDataProvider = new NotebooksTreeDataProvider(plutoManager);

  // Register tree view
  const treeView = vscode.window.createTreeView("plutoNotebooks", {
    treeDataProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(treeView);
  context.subscriptions.push(treeDataProvider);

  // Register command to open notebook from tree
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.openNotebookFromTree",
      async (notebookPath: string) => {
        try {
          const uri = vscode.Uri.file(notebookPath);
          await vscode.commands.executeCommand("vscode.open", uri);
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

  // Register command to focus cell from tree
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pluto-notebook.focusCellFromTree",
      async (notebookPath: string, cellId: string) => {
        try {
          // Open the notebook document
          const uri = vscode.Uri.file(notebookPath);
          const document = await vscode.workspace.openNotebookDocument(uri);

          // Show the notebook editor
          await vscode.window.showNotebookDocument(document);

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

  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("pluto-notebook.refreshNotebooks", () => {
      treeDataProvider.refresh();
    })
  );

  // Register reconnect notebook command
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
          treeDataProvider.refresh();
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
