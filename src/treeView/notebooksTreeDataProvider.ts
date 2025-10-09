import * as vscode from "vscode";
import { PlutoManager } from "../plutoManager.ts";
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

  /**
   * Refresh the tree view
   */
  refresh = (): void => {
    console.log("[TreeView] Refreshing tree view");
    this._onDidChangeTreeData.fire();
  };

  constructor(private plutoManager: PlutoManager) {
    // Listen to PlutoManager events
    this.plutoManager.on("serverStateChanged", this.refresh);
    this.plutoManager.on("notebookOpened", this.refresh);
    this.plutoManager.on("notebookClosed", this.refresh);
    this.plutoManager.on("cellUpdated", this.refresh);
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

    return Promise.all(
      notebooks.map(async (notebook) => {
        const basename = notebook.path.split("/").pop() || notebook.path;

        // Determine notebook status icon
        let status = "$(circle-outline)";
        try {
          // Check if notebook is connected by trying to get worker
          const worker = await this.plutoManager.getWorker(notebook.path);
          if (!worker) {
            status = "$(debug-disconnect)"; // Not connected
          }
          const plutoNotebook: NotebookData | undefined = worker?.getState();
          status = plutoNotebook?.process_status || "";
        } catch (error) {
          status = "Error";
        }

        const label = `${basename}-${status}`;

        const item = new NotebookTreeItem(
          label,
          vscode.TreeItemCollapsibleState.Expanded,
          TreeItemType.Notebook,
          notebook.path
        );

        console.log(`[TreeView] Created notebook item: ${label}`);
        return item;
      })
    );
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

          // Get cell code for tooltip
          const code = cellData.input?.code || "";

          // Create cell label
          const label = `${icon} ${cellId}`;

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
    this.plutoManager.off("serverStateChanged", this.refresh);
    this.plutoManager.off("notebookOpened", this.refresh);
    this.plutoManager.off("notebookClosed", this.refresh);
    this.plutoManager.off("cellUpdated", this.refresh);
  }
}
