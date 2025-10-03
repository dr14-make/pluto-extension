import * as vscode from "vscode";
import {
  parsePlutoNotebook,
  serializePlutoNotebook,
  type ParsedCell,
} from "./plutoSerializer.ts";
import { CellResultData } from "@plutojl/rainbow";

export function proceedCell(cell: ParsedCell): vscode.NotebookCellData {
  const cellData = new vscode.NotebookCellData(
    cell.kind === "markdown"
      ? vscode.NotebookCellKind.Markup
      : vscode.NotebookCellKind.Code,
    cell.code,
    "julia"
  );

  // Store the cell UUID in metadata for round-trip serialization
  cellData.metadata = {
    pluto_cell_id: cell.id,
    ...cell.metadata,
  };
  return cellData;
}

export function formatCellOutput(
  output: CellResultData["output"]
): vscode.NotebookCellOutput {
  // Handle different output types from Pluto
  if (output.body) {
    // HTML output
    return new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.text(output.body, output.mime),
    ]);
  } else {
    // Fallback: stringify the output
    return new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.text(JSON.stringify(output, null, 2)),
    ]);
  }
}

export class PlutoNotebookSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    const contents = new TextDecoder().decode(content);

    try {
      const parsed = await parsePlutoNotebook(contents);

      // Convert ParsedCell to VSCode NotebookCellData
      const cells: vscode.NotebookCellData[] = parsed.cells.map(proceedCell);

      // Create notebook data with metadata
      const notebookData = new vscode.NotebookData(cells);
      notebookData.metadata = {
        pluto_notebook_id: parsed.notebook_id,
        pluto_version: parsed.pluto_version,
      };

      return notebookData;
    } catch (error) {
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
      // Convert VSCode cells to ParsedCell format
      const cells: ParsedCell[] = data.cells.map((cell) => ({
        id: cell.metadata?.pluto_cell_id as string,
        code: cell.value,
        kind:
          cell.kind === vscode.NotebookCellKind.Markup ? "markdown" : "code",
        metadata: cell.metadata || {},
      }));

      const serialized = await serializePlutoNotebook(
        cells,
        data.metadata?.pluto_notebook_id as string,
        data.metadata?.pluto_version as string
      );

      return new TextEncoder().encode(serialized);
    } catch (error) {
      // Fallback: concatenate all cells
      const contents = data.cells.map((cell) => cell.value).join("\n\n");
      return new TextEncoder().encode(contents);
    }
  }
}
