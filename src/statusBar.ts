import * as vscode from "vscode";
import { PlutoManager } from "./plutoManager.ts";

/**
 * Manages the Pluto server status bar item
 */
export class PlutoStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  /**
   * Update the status bar item based on server state
   */
  private update = (): void => {
    const isRunning = this.plutoManager.isRunning();
    const isConnected = this.plutoManager.isConnected();

    if (isRunning && isConnected) {
      this.setRunning();
    } else if (!isConnected && isRunning) {
      this.setStarting();
    } else {
      this.setStopped();
    }
  };

  constructor(private plutoManager: PlutoManager) {
    // Create status bar item (aligned to right, priority 100)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    // Set the command to toggle server (start/stop)
    this.statusBarItem.command = "pluto-notebook.toggleServer";

    // Initial update
    this.update();

    this.plutoManager.on("serverStateChanged", this.update);

    // Show the status bar item
    this.statusBarItem.show();
  }

  private setRunning() {
    // Server is running and connected
    this.statusBarItem.text = "$(check) Pluto";
    this.statusBarItem.tooltip = `Pluto server is running on ${this.plutoManager.getServerUrl()}\nClick to stop`;
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.prominentForeground"
    );
  }
  private setStarting() {
    // Server task is running but not connected yet (starting)
    this.statusBarItem.text = "$(sync~spin) Pluto";
    this.statusBarItem.tooltip = "Pluto server is starting...\nClick to stop";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
    this.statusBarItem.color = undefined;
  }
  private setStopped() {
    // Server is stopped
    this.statusBarItem.text = "$(debug-stop) Pluto";
    this.statusBarItem.tooltip = "Pluto server is stopped\nClick to start";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.foreground"
    );
  }
  /**
   * Force an immediate update of the status bar
   */
  public refresh(): void {
    this.update();
  }

  /**
   * Dispose of the status bar item and cleanup
   */
  dispose(): void {
    this.plutoManager.off("serverStateChanged", this.update);
    this.statusBarItem.dispose();
  }
}
