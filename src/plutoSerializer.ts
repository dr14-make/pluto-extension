import type { CellInputData, NotebookData } from "@plutojl/rainbow";
import { parse, serialize } from "./rainbowAdapter.ts";
import * as vscode from "vscode";
import { formatCellOutput } from "./serializer.ts";
import { v4 as uuidv4, validate } from "uuid";
import { isDefined, isNotDefined } from "./helpers.ts";

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
): vscode.NotebookCellData | null {
  // Validate UUID format and check cell exists
  const cellInput = notebookData.cell_inputs[plutoCellId];

  if (!validate(plutoCellId) || isNotDefined(cellInput)) {
    throw new Error(
      `Invalid or missing cell ID: ${plutoCellId} fix in the code`
    );
  }

  let code = cellInput.code ?? "";

  // Check if cell is markdown by looking for #VSCODE-MARKDOWN marker or md""" wrapper
  const isVSCodeMarkdown = isMarkdownCell(code);
  const possibleMdCode = extractMarkdownContent(code);
  // Cell is markdown if it has EITHER the VSCODE-MARKDOWN marker OR the md""" wrapper
  const isMarkdown = isVSCodeMarkdown && isDefined(possibleMdCode);

  // Extract markdown content from md"""...""" wrapper
  if (isMarkdown) {
    code = possibleMdCode;
  }

  const cellData = new vscode.NotebookCellData(
    isMarkdown ? vscode.NotebookCellKind.Markup : vscode.NotebookCellKind.Code,
    code,
    isMarkdown ? "markdown" : "julia"
  );
  const results = notebookData.cell_results[plutoCellId] ?? null;
  if (results !== null) {
    // Add output if available
    cellData.outputs = [formatCellOutput(results)];
  }
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
  if (isNotDefined(notebookData)) {
    return {
      cells: [],
      notebook_id: "",
      pluto_version: "",
    };
  }
  const cell_order =
    notebookData.cell_order ?? Object.keys(notebookData.cell_inputs);
  for (const cellId of cell_order) {
    const cell = createVsCodeCellFromPlutoCell(notebookData, cellId);
    if (isNotDefined(cell)) {
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
export function serializePlutoNotebook(
  cells: vscode.NotebookCellData[],
  notebookId?: string,
  plutoVersion?: string
): string {
  const cellInputs: Record<string, PlutoCellData> = {};
  const cellOrder: string[] = [];

  for (const cell of cells) {
    const cellId = cell.metadata?.pluto_cell_id ?? generateCellId();

    // Wrap markdown cells in md"""...""" and add #VSCODE-MARKDOWN marker
    let code = cell.value;
    if (cell.kind === vscode.NotebookCellKind.Markup) {
      // Add #VSCODE-MARKDOWN marker as first line, followed by md""" wrapper
      code = `#VSCODE-MARKDOWN\nmd"""${cell.value}"""`;
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
    notebook_id: notebookId ?? generateNotebookId(),
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

  return serialize(notebookData);
}

/**
 * Extract markdown content from md"""...""" wrapper
 * Handles newlines, spaces, and all characters within the quotes
 * Also strips #VSCODE-MARKDOWN marker if present
 */
export function extractMarkdownContent(code: string): string | undefined {
  // First, remove #VSCODE-MARKDOWN marker if present (with optional whitespace before)
  const cleaned = code.replace(/^\s*#VSCODE-MARKDOWN\s*\n?/, "");

  // Match triple-quote markdown: md"""CONTENT"""
  // [\s\S] matches any character including newlines
  // Allow any whitespace/newlines before md"""
  const tripleQuoteMatch = cleaned.match(/^\s*md"""([\s\S]*?)"""\s*$/);
  if (tripleQuoteMatch) {
    return tripleQuoteMatch[1];
  }

  // Match single-quote markdown: md"content"
  const singleQuoteMatch = cleaned.match(/^\s*md"([^"]*)"\s*$/);
  if (singleQuoteMatch) {
    return singleQuoteMatch[1];
  }

  // If no match, return the cleaned version (without the marker)
  return undefined;
}

/**
 * Detect if code is markdown
 */
export function isMarkdownCell(code: string): boolean {
  return /^\s*#VSCODE-MARKDOWN/.test(code);
}

/**
 * Generate a UUID v4
 */
export function generateCellId(): string {
  return uuidv4();
}

/**
 * Generate a notebook ID
 */
export function generateNotebookId(): string {
  return generateCellId();
}
