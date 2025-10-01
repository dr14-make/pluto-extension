import * as vscode from "vscode";
import {
  CellInputData,
  CellResultData,
  Host,
  UpdateEvent,
  Worker,
} from "@plutojl/rainbow";
/**
 * Manages connection to Pluto server and notebook sessions
 */
export class PlutoManager {
  private host?: Host; // Host from @plutojl/rainbow
  private workers: Map<string, Worker> = new Map(); // notebook_id -> Worker
  private serverUrl: string;

  constructor(serverUrl: string = "http://localhost:1234") {
    this.serverUrl = serverUrl;
  }

  /**
   * Initialize connection to Pluto server
   */
  async initialize(): Promise<void> {
    this.host = new Host(this.serverUrl);
  }

  /**
   * Get or create a worker for a notebook
   */
  async getWorker(
    notebookUri: vscode.Uri,
    notebookContent?: string
  ): Promise<Worker | undefined> {
    if (!this.host) {
      await this.initialize();
    }

    const notebookPath = notebookUri.fsPath;

    // Check if we already have a worker for this notebook
    let worker = this.workers.get(notebookPath);

    if (!worker && this.host) {
      // Create a new worker by uploading notebook content
      if (notebookContent) {
        worker = await this.host.createWorker(notebookContent);
        this.workers.set(notebookPath, worker);
      } else {
        throw new Error("Cannot create worker without notebook content");
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
    // todo: check this type, export and fix upstream
  ): Promise<{ input: CellInputData; results: CellResultData } | null> {
    try {
      // Update cell code and run it
      await worker.updateSnippetCode(cellId, code, true);

      // Wait for execution to complete
      await worker.wait(true);

      // Get cell result
      const cellData = worker.getSnippet(cellId);
      return cellData;
    } catch (error) {
      console.error("Error executing cell:", error);
      throw error;
    }
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
   * Close connection to a notebook
   */
  closeNotebook(notebookUri: vscode.Uri): void {
    const notebookPath = notebookUri.fsPath;
    const worker = this.workers.get(notebookPath);

    if (worker) {
      worker.close();
      this.workers.delete(notebookPath);
    }
  }

  /**
   * Close all notebook connections
   */
  dispose(): void {
    for (const worker of this.workers.values()) {
      worker.close();
    }
    this.workers.clear();
  }

  /**
   * Subscribe to notebook updates
   */
  onNotebookUpdate(
    worker: Worker,
    callback: (event: UpdateEvent) => void
  ): () => void {
    return worker.onUpdate(callback);
  }
}
