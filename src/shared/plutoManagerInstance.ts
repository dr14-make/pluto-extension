import "@plutojl/rainbow/node-polyfill";
import { PlutoManager } from "../plutoManager.ts";

/**
 * Shared PlutoManager instance that can be used by both the extension and MCP server
 * This ensures they use the same Pluto server connection and worker sessions
 */
let sharedPlutoManager: PlutoManager | undefined;

export function getSharedPlutoManager(
  port: number,
  outputChannel: {
    appendLine: (msg: string) => void;
    showWarningMessage<T extends string>(
      message: string,
      ...items: T[]
    ): Thenable<T | undefined>;
  }
): PlutoManager {
  if (!sharedPlutoManager) {
    sharedPlutoManager = new PlutoManager(port, outputChannel);
  }
  return sharedPlutoManager;
}

export function clearSharedPlutoManager(): void {
  sharedPlutoManager = undefined;
}
