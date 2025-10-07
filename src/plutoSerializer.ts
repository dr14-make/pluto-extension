import { CellInputData, NotebookData } from "@plutojl/rainbow";
import { parse, serialize } from "./rainbowAdapter.ts";
import * as vscode from "vscode";

/**
 * Pure functions for Pluto notebook parsing and serialization
 * These functions are separated from VSCode types for easier testing
 */

export type PlutoCellData = CellInputData;

export type PlutoNotebookData = NotebookData;

export interface ParsedNotebook {
  cells: vscode.NotebookCellData[];
  notebook_id: string;
  pluto_version?: string;
}

export function createVsCodeCellFromPlutoCell(
  notebookData: NotebookData,
  plutoCellId: string
) {
  const cellInput = notebookData.cell_inputs[plutoCellId];
  if (!cellInput) {
    return undefined;
  }

  const code = cellInput.code || "";
  const isMarkdown = false;
  const cellData = new vscode.NotebookCellData(
    isMarkdown ? vscode.NotebookCellKind.Markup : vscode.NotebookCellKind.Code,
    code,
    "julia"
  );

  cellData.metadata = {
    pluto_cell_id: plutoCellId,
    ...cellInput.metadata,
  };
  // TODO add outputs
  // cellData.outputs = [];
  return cellData;
}
/**
 * Parse a Pluto notebook file and extract cells
 */
export function parsePlutoNotebook(content: string): ParsedNotebook {
  const notebookData = parse(content);

  const cells: vscode.NotebookCellData[] = [];
  if (!notebookData) {
    return {
      cells: [],
      notebook_id: "",
      pluto_version: "",
    };
  }
  for (const cellId of notebookData.cell_order) {
    const cell = createVsCodeCellFromPlutoCell(notebookData, cellId);
    if (!cell) {
      continue;
    }

    cells.push(cell);
  }

  return {
    cells,
    notebook_id: notebookData.notebook_id,
    pluto_version: notebookData.pluto_version,
  };
}

/**
 * Serialize cells back to Pluto notebook format
 */
export async function serializePlutoNotebook(
  cells: vscode.NotebookCellData[],
  notebookId?: string,
  plutoVersion?: string
): Promise<string> {
  const cellInputs: Record<string, PlutoCellData> = {};
  const cellOrder: string[] = [];

  for (const cell of cells) {
    const cellId = cell.metadata?.pluto_cell_id || generateCellId();

    // Wrap markdown cells in md"""..."""
    let code = cell.value;
    if (cell.kind === vscode.NotebookCellKind.Markup) {
      code = `md"""\n${cell.value}\n"""`;
    }

    cellInputs[cellId] = {
      cell_id: cellId,
      code: code,
      code_folded: false,
      metadata: {
        disabled: false,
        show_logs: false,
        skip_as_script: false,
        ...cell.metadata,
      },
    };

    cellOrder.push(cellId);
  }

  const notebookData: PlutoNotebookData = {
    notebook_id: notebookId || generateNotebookId(),
    pluto_version: plutoVersion,
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

  return await serialize(notebookData);
}

/**
 * Detect if code is markdown
 */
export function isMarkdownCell(code: string): boolean {
  return /^\s*md"/.test(code);
}

/**
 * Generate a UUID v4
 */
export function generateCellId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a notebook ID
 */
export function generateNotebookId(): string {
  return generateCellId();
}

/**
 * Validate Pluto notebook format
 */
export function isValidPlutoNotebook(content: string): boolean {
  return (
    content.includes("### A Pluto.jl notebook ###") && content.includes("╔═╡")
  );
}

/**
 * Extract cell count from notebook content
 */
export function getCellCount(content: string): number {
  const cellMarkerRegex = /# ╔═╡ [a-f0-9-]+\n/g;
  const matches = content.match(cellMarkerRegex);
  return matches ? matches.length : 0;
}
