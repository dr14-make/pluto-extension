/**
 * Commands module - organized by domain
 *
 * This module exports all command registration functions grouped by their domain:
 * - Pluto Server: Commands for managing the Pluto Julia server
 * - MCP Server: Commands for managing the MCP HTTP server
 * - MCP Config: Commands for configuring MCP clients (Claude, Copilot)
 */

import * as vscode from "vscode";
import { PlutoManager } from "../plutoManager.ts";

// Re-export all commands from domain-specific modules
export * from "./plutoServerCommands.ts";
export * from "./mcpServerCommands.ts";
export * from "./mcpConfigCommands.ts";

// Import for registerAllCommands
import {
  registerStartServerCommand,
  registerStopServerCommand,
  registerRestartServerCommand,
} from "./plutoServerCommands.ts";

import {
  registerStartMCPServerCommand,
  registerStopMCPServerCommand,
  registerRestartMCPServerCommand,
} from "./mcpServerCommands.ts";

import {
  registerCreateProjectMCPConfigCommand,
  registerGetMCPHttpUrlCommand,
} from "./mcpConfigCommands.ts";

/**
 * Register all commands at once
 *
 * This is a convenience function that registers all commands from all domains.
 * It's called during extension activation.
 *
 * @param context - Extension context for registering commands
 * @param plutoManager - Shared PlutoManager instance
 */
export function registerAllCommands(
  context: vscode.ExtensionContext,
  plutoManager: PlutoManager
): void {
  // Register Pluto Server commands
  registerStartServerCommand(context, plutoManager);
  registerStopServerCommand(context, plutoManager);
  registerRestartServerCommand(context, plutoManager);

  // Register MCP Server commands
  registerStartMCPServerCommand(context);
  registerStopMCPServerCommand(context);
  registerRestartMCPServerCommand(context);

  // Register MCP Config commands
  registerCreateProjectMCPConfigCommand(context);
  registerGetMCPHttpUrlCommand(context);
}
