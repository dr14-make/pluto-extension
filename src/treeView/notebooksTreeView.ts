import * as vscode from "vscode";
import { PlutoManager } from "../plutoManager.ts";
import { NotebooksTreeDataProvider } from "./notebooksTreeDataProvider.ts";

/**
 * Register notebooks tree view with commands
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

  // Register commands

  context.subscriptions.push(
    vscode.commands.registerCommand("pluto-notebook.refreshNotebooks", () => {
      treeDataProvider.refresh();
    })
  );

  // Add to subscriptions
  context.subscriptions.push(treeView);
  context.subscriptions.push(treeDataProvider);
}
