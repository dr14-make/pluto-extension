import "@plutojl/rainbow/node-polyfill";
import { CellResultData, Host, Worker } from "@plutojl/rainbow";
import { readFile } from "fs/promises";
import { PlutoServerTaskManager } from "./plutoServerTask.js";
import { EventEmitter } from "events";

/**
 * Events emitted by PlutoManager
 */
export interface PlutoManagerEvents {
  serverStateChanged: () => void;
  notebookOpened: (notebookPath: string) => void;
  notebookClosed: (notebookPath: string) => void;
  cellUpdated: (notebookPath: string, cellId: string) => void;
}

/**
 * Manages connection to Pluto server and notebook sessions
 */
export class PlutoManager {
  private host?: Host; // Host from @plutojl/rainbow
  private workers: Map<string, Worker> = new Map(); // notebook_id -> Worker
  private serverUrl: string;
  private taskManager: PlutoServerTaskManager;
  private usingCustomServerUrl: boolean = false;
  private notebooksToRecreate: Set<string> = new Set(); // Paths of notebooks to recreate after reconnect
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(
    private port: number = 1234,
    private showWarningMessage: <T extends string>(
      message: string,
      ...items: T[]
    ) => Thenable<T | undefined>,
    serverUrl?: string
  ) {
    if (serverUrl) {
      this.serverUrl = serverUrl;
      this.usingCustomServerUrl = true;
    } else {
      this.serverUrl = `http://localhost:${port}`;
    }

    this.taskManager = new PlutoServerTaskManager(port);

    // Register callback to reset state when server task stops
    this.taskManager.onStop(() => {
      this.onServerStopped();
    });
  }

  /**
   * Register event listener
   */
  on<K extends keyof PlutoManagerEvents>(
    event: K,
    listener: PlutoManagerEvents[K]
  ): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof PlutoManagerEvents>(
    event: K,
    listener: PlutoManagerEvents[K]
  ): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Emit event
   */
  private emit<K extends keyof PlutoManagerEvents>(
    event: K,
    ...args: Parameters<PlutoManagerEvents[K]>
  ): void {
    this.eventEmitter.emit(event, ...args);
  }

  /**
   * Called when server task stops unexpectedly
   */
  private onServerStopped(): void {
    // Store notebook paths for recreation after reconnect
    this.notebooksToRecreate.clear();
    for (const notebookPath of this.workers.keys()) {
      this.notebooksToRecreate.add(notebookPath);
    }

    // Close all workers
    for (const worker of this.workers.values()) {
      worker.shutdown();
    }
    this.workers.clear();

    // Reset host
    this.host = undefined;

    // Emit server state changed event
    this.emit("serverStateChanged");

    // Show warning to user if server stopped unexpectedly
    if (this.taskManager.isRunning() === false) {
      this.showWarningMessage(
        "Pluto server stopped unexpectedly. Click 'Restart' to start it again.",
        "Restart"
      ).then((choice) => {
        if (choice === "Restart") {
          this.start().catch((error) => {
            this.showWarningMessage(
              `Failed to restart Pluto server: ${error.message}`
            );
          });
        }
      });
    }
  }

  /**
   * Check if Pluto server is running
   */
  isRunning(): boolean {
    return this.taskManager.isRunning() && this.isConnected();
  }

  /**
   * Check if connected to a host (with or without owning the process)
   */
  isConnected(): boolean {
    return !!this.host;
  }

  /**
   * Connect to an existing Pluto server without starting a new one
   */
  async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    try {
      this.host = new Host(this.serverUrl);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start Pluto server (or connect to custom server URL)
   */
  async start(): Promise<void> {
    // If using custom server URL, just connect without starting
    if (this.usingCustomServerUrl) {
      await this.connect();
      await this.recreateWorkers();
      return;
    }

    // Check if already running
    if (this.taskManager.isRunning()) {
      return;
    }

    try {
      await this.taskManager.start();
      await this.taskManager.waitForReady();
      await this.connect();

      // Emit server state changed event
      this.emit("serverStateChanged");

      // Recreate workers for notebooks that were open before server stopped
      await this.recreateWorkers();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Recreate workers for notebooks that were open before server stopped
   */
  private async recreateWorkers(): Promise<void> {
    if (this.notebooksToRecreate.size === 0) {
      return;
    }

    const notebookPaths = Array.from(this.notebooksToRecreate);
    this.notebooksToRecreate.clear();

    for (const notebookPath of notebookPaths) {
      try {
        // Use getWorker to recreate the worker
        await this.getWorker(notebookPath);
      } catch (error) {
        // Log error but continue with other notebooks
        console.error(`Failed to recreate worker for ${notebookPath}:`, error);
      }
    }
  }

  /**
   * Stop Pluto server
   */
  async stop(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      worker.shutdown();
    }
    this.workers.clear();

    // Stop task
    if (this.taskManager.isRunning()) {
      await this.taskManager.stop();
    }

    this.host = undefined;

    // Emit server state changed event
    this.emit("serverStateChanged");
  }

  /**
   * Restart Pluto server
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Get or create a worker for a notebook
   * const notebookPath = notebookUri.fsPath;
   */
  async getWorker(notebookPath: string): Promise<Worker | undefined> {
    if (!this.isConnected()) {
      await this.start();
    }

    // Check if we already have a worker for this notebook
    let worker = this.workers.get(notebookPath);

    if (!worker && this.host) {
      // Read notebook content from file
      let notebookContent: string;
      try {
        const fileContent = await readFile(notebookPath);
        notebookContent = new TextDecoder().decode(fileContent);
        worker = await this.host.createWorker(notebookContent.trim());
        this.workers.set(notebookPath, worker);

        // Emit notebook opened event
        this.emit("notebookOpened", notebookPath);
      } catch (error) {
        throw new Error(
          `Cannot create worker: failed to read notebook file: ${error}`
        );
      }
    }

    // Ensure worker is connected
    if (worker && !worker.connected) {
      await worker.connect();
    }

    return worker;
  }

  /**
   * Execute a cell
   */
  async executeCell(
    worker: Worker,
    cellId: string,
    code: string
  ): Promise<CellResultData | null> {
    try {
      // Update existing cell code and run it
      await worker.updateSnippetCode(cellId, code, true);

      // Wait for execution to complete
      // await worker.wait(true);

      // Get cell result
      const cellData = worker.getSnippet(cellId);
      const result = cellData?.result || null;
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Emit cell updated event (to be called by controller)
   */
  emitCellUpdated(notebookPath: string, cellId: string): void {
    this.emit("cellUpdated", notebookPath, cellId);
  }

  /**
   * Add a new cell to the notebook
   */
  async addCell(worker: Worker, index: number, code: string): Promise<string> {
    const cellId = await worker.addSnippet(index, code);
    return cellId;
  }

  /**
   * Delete a cell from the notebook
   */
  async deleteCell(worker: Worker, cellId: string): Promise<void> {
    await worker.deleteSnippets([cellId]);
  }

  /**
   * Restart the notebook kernel
   */
  async restartNotebook(worker: Worker): Promise<void> {
    await worker.restart();
  }

  /**
   * Get the server URL
   */
  getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Close connection to a notebook
   * const notebookPath = notebookUri.fsPath;
   */
  async closeNotebook(notebookPath: string): Promise<void> {
    const worker = this.workers.get(notebookPath);

    if (worker) {
      await worker.shutdown();
      this.workers.delete(notebookPath);

      // Emit notebook closed event
      this.emit("notebookClosed", notebookPath);
    }
  }

  /**
   * Get list of open notebooks
   */
  getOpenNotebooks(): Array<{ path: string; notebookId: string }> {
    const notebooks: Array<{ path: string; notebookId: string }> = [];
    for (const [path, worker] of this.workers.entries()) {
      notebooks.push({
        path,
        notebookId: worker.notebook_id,
      });
    }
    return notebooks;
  }

  /**
   * Execute Julia code in a notebook without creating a persistent cell
   * This uses waitSnippet at index 0 and then immediately deletes the cell
   */
  async executeCodeEphemeral(
    worker: Worker,
    code: string
  ): Promise<CellResultData> {
    try {
      // Execute code at index 0 (creates a temporary cell)
      const result = await worker.waitSnippet(0, code);

      // Delete the cell immediately after execution
      try {
        await worker.deleteSnippets([result.cell_id]);
      } catch (deleteError) {
        // Silently ignore deletion errors for ephemeral cells
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Close all notebook connections
   */
  dispose(): void {
    for (const worker of this.workers.values()) {
      worker.shutdown();
    }
    this.workers.clear();

    // Stop task (fire and forget - dispose is not async)
    if (this.taskManager.isRunning()) {
      this.taskManager.stop().catch(() => {
        // Ignore errors during dispose
      });
    }
  }
}
