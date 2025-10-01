import * as vscode from "vscode";
import {} from "@plutojl/rainbow";
export class PlutoNotebookSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    const contents = new TextDecoder().decode(content);

    try {
      // Use @plutojl/rainbow parser to parse the Pluto .jl file
      const { parse } = await import("@plutojl/rainbow");
      const notebookData = parse(contents);

      // Convert Pluto NotebookData to VSCode NotebookData
      const cells: vscode.NotebookCellData[] = [];

      for (const cellId of notebookData.cell_order) {
        const cellInput = notebookData.cell_inputs[cellId];
        if (!cellInput) {
          continue;
        }

        // Determine cell kind - Pluto doesn't have explicit markdown cells,
        // but we can detect them by checking if code starts with md"..."
        const code = cellInput.code || "";
        const isMarkdown = /^\s*md"/.test(code);

        const cellData = new vscode.NotebookCellData(
          isMarkdown
            ? vscode.NotebookCellKind.Markup
            : vscode.NotebookCellKind.Code,
          code,
          "julia"
        );

        // Store the cell UUID in metadata for round-trip serialization
        cellData.metadata = {
          pluto_cell_id: cellId,
          ...cellInput.metadata,
        };

        cells.push(cellData);
      }

      // Store notebook-level metadata
      const notebookMetadata = {
        pluto_notebook_id: notebookData.notebook_id,
        pluto_version: notebookData.pluto_version,
      };

      return new vscode.NotebookData(cells);
    } catch (error) {
      console.error("Error parsing Pluto notebook:", error);
      // Fallback: treat as single code cell if parsing fails
      return new vscode.NotebookData([
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          contents,
          "julia"
        ),
      ]);
    }
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    try {
      // Build NotebookData structure for @plutojl/rainbow serializer
      const cellInputs: Record<string, any> = {};
      const cellOrder: string[] = [];

      for (const cell of data.cells) {
        // Get or generate cell UUID
        const cellId =
          (cell.metadata?.pluto_cell_id as string) || this.generateCellId();

        cellInputs[cellId] = {
          cell_id: cellId,
          code: cell.value,
          metadata: cell.metadata || {},
        };

        cellOrder.push(cellId);
      }

      const notebookData: any = {
        notebook_id:
          data.metadata?.pluto_notebook_id || this.generateNotebookId(),
        pluto_version: data.metadata?.pluto_version,
        path: "",
        shortpath: "",
        in_temp_dir: false,
        process_status: "ready",
        last_save_time: Date.now() / 1000,
        last_hot_reload_time: 0,
        cell_inputs: cellInputs,
        cell_results: {},
        cell_dependencies: {},
        cell_order: cellOrder,
        cell_execution_order: [],
        published_objects: {},
        bonds: {},
        nbpkg: null,
        metadata: {},
        status_tree: null,
      };

      // Use @plutojl/rainbow serializer to generate Pluto .jl file
      const { serialize } = await import("@plutojl/rainbow");
      const serialized = serialize(notebookData);
      return new TextEncoder().encode(serialized);
    } catch (error) {
      console.error("Error serializing Pluto notebook:", error);
      // Fallback: concatenate all cells
      const contents = data.cells.map((cell) => cell.value).join("\n\n");
      return new TextEncoder().encode(contents);
    }
  }

  private generateCellId(): string {
    // Generate UUID v4
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private generateNotebookId(): string {
    return this.generateCellId();
  }
}
