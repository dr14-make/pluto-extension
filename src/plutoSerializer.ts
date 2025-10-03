import { CellInputData, NotebookData } from "@plutojl/rainbow";
import { parse, serialize } from "./rainbowAdapter.ts";

/**
 * Pure functions for Pluto notebook parsing and serialization
 * These functions are separated from VSCode types for easier testing
 */

export type PlutoCellData = CellInputData;

export type PlutoNotebookData = NotebookData;

export interface ParsedCell {
  id: string;
  code: string;
  kind: "code" | "markdown";
  metadata: any;
}

export interface ParsedNotebook {
  cells: ParsedCell[];
  notebook_id: string;
  pluto_version?: string;
}

/**
 * Parse a Pluto notebook file and extract cells
 */
export function parsePlutoNotebook(content: string): ParsedNotebook {
  const notebookData = parse(content);

  const cells: ParsedCell[] = [];

  for (const cellId of notebookData.cell_order) {
    const cellInput = notebookData.cell_inputs[cellId];
    if (!cellInput) {
      continue;
    }

    const code = cellInput.code || "";
    const isMarkdown = isMarkdownCell(code);

    // Extract markdown content from md"""...""" wrapper
    let cellCode = code;
    if (isMarkdown) {
      const match = code.match(/^\s*md"""([\s\S]*?)"""\s*$/m);
      if (match) {
        cellCode = match[1];
      }
    }

    cells.push({
      id: cellId,
      code: cellCode,
      kind: isMarkdown ? "markdown" : "code",
      metadata: cellInput.metadata || {},
    });
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
  cells: ParsedCell[],
  notebookId?: string,
  plutoVersion?: string
): Promise<string> {
  const cellInputs: Record<string, PlutoCellData> = {};
  const cellOrder: string[] = [];

  for (const cell of cells) {
    const cellId = cell.id || generateCellId();

    // Wrap markdown cells in md"""..."""
    let code = cell.code;
    if (cell.kind === "markdown") {
      code = `md"""\n${cell.code}\n"""`;
    }

    cellInputs[cellId] = {
      cell_id: cellId,
      code: code,
      code_folded: false,
      metadata: cell.metadata || {},
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
