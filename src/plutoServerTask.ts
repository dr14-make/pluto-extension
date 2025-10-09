import * as vscode from "vscode";

/**
 * Manages Pluto server as a VSCode task with terminal integration
 */
export class PlutoServerTaskManager {
  private taskExecution?: vscode.TaskExecution;
  private serverReadyPromise?: Promise<void>;
  private serverReadyResolve?: () => void;
  private onStopCallback?: () => void;
  private taskEndListener?: vscode.Disposable;
  private isStarting: boolean = false;

  constructor(private port: number = 1234) {}

  /**
   * Check if server task is running
   */
  isRunning(): boolean {
    return !!this.taskExecution || this.isStarting;
  }

  /**
   * Set callback to be called when server stops
   */
  onStop(callback: () => void): void {
    this.onStopCallback = callback;
  }

  /**
   * Start Pluto server as a VSCode task
   */
  async start(): Promise<void> {
    if (this.taskExecution || this.isStarting) {
      throw new Error("Pluto server task is already running");
    }

    // Check if there's already a Pluto server task running from a previous session
    const existingTasks = vscode.tasks.taskExecutions;
    for (const execution of existingTasks) {
      if (
        execution.task.name === `Pluto Server (port ${this.port})` ||
        execution.task.definition.type === "pluto-server"
      ) {
        console.log(
          "[PlutoServerTask] Found existing task, reusing it instead of creating new one"
        );
        this.taskExecution = execution;
        return;
      }
    }

    // Set starting flag immediately to prevent race condition
    this.isStarting = true;

    // Create promise that resolves when server is ready
    this.serverReadyPromise = new Promise<void>((resolve) => {
      this.serverReadyResolve = resolve;
    });

    // Create the task definition
    const taskDefinition: vscode.TaskDefinition = {
      type: "pluto-server",
      port: this.port,
    };

    // Create shell execution for Julia command
    const shellExecution = new vscode.ShellExecution("julia", [
      "-e",
      `using Pluto; Pluto.run(port=${this.port}; require_secret_for_open_links=false, require_secret_for_access=false, launch_browser=false)`,
    ]);

    // Create the task
    const task = new vscode.Task(
      taskDefinition,
      vscode.TaskScope.Workspace,
      `Pluto Server (port ${this.port})`,
      "pluto-notebook",
      shellExecution,
      [] // No problem matchers
    );

    // Configure task presentation
    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      panel: vscode.TaskPanelKind.Dedicated,
      showReuseMessage: false,
      clear: false,
      focus: false,
      echo: true,
    };

    // Set as background task
    task.isBackground = true;

    // Listen for task end - this will reset state when task stops
    this.taskEndListener = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution === this.taskExecution) {
        // Task ended - reset state
        this.taskExecution = undefined;
        this.serverReadyPromise = undefined;
        this.serverReadyResolve = undefined;
        this.isStarting = false;

        // Cleanup listener
        if (this.taskEndListener) {
          this.taskEndListener.dispose();
          this.taskEndListener = undefined;
        }

        // Notify callback that server stopped
        if (this.onStopCallback) {
          this.onStopCallback();
        }
      }
    });

    // Execute the task
    this.taskExecution = await vscode.tasks.executeTask(task);
    this.isStarting = false; // Clear starting flag once task is executing

    // Poll server URL until it responds (more reliable than timeout)
    try {
      // TODO some wierd behaviour with julia command executing twice in the begining so bandage for 15 sec wait
      await new Promise((r) => setTimeout(r, 15000)); // Initial wait before polling
      await this.pollServerReady();
      if (this.serverReadyResolve) {
        this.serverReadyResolve();
      }
    } catch (error) {
      // Server didn't become ready in time
      this.taskExecution.terminate();
      this.taskExecution = undefined;
      this.isStarting = false;

      // Cleanup listener
      if (this.taskEndListener) {
        this.taskEndListener.dispose();
        this.taskEndListener = undefined;
      }

      throw error;
    }
  }

  /**
   * Poll server URL until it responds
   */
  private async pollServerReady(): Promise<void> {
    const maxAttempts = 60; // 60 seconds total (60 attempts * 1 second)
    const pollInterval = 1000; // 1 second between attempts

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Try to fetch from server
        const response = await fetch(this.getServerUrl(), {
          method: "GET",
          signal: AbortSignal.timeout(2000), // 2 second timeout per request
        });

        // If we get any response (even error), server is running
        if (response) {
          return;
        }
      } catch (error) {
        // Server not ready yet, continue polling
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Pluto server did not start within ${maxAttempts} seconds`);
  }

  /**
   * Stop Pluto server task
   */
  async stop(): Promise<void> {
    if (!this.taskExecution) {
      return;
    }

    // Terminate the task (this will trigger the onDidEndTaskProcess listener)
    this.taskExecution.terminate();
    // Note: State reset happens in the listener
  }

  /**
   * Get the server URL
   */
  getServerUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Wait for server to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.serverReadyPromise) {
      await this.serverReadyPromise;
    }
  }
}
