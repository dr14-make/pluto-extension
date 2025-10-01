import * as vscode from "vscode";
import { Host } from "@plutojl/rainbow";
/**
 * Manages connection to Pluto server and notebook sessions
 */
export class PlutoManager {
  private host: any; // Host from @plutojl/rainbow
  private workers: Map<string, any> = new Map(); // notebook_id -> Worker
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
    notebookContent?: string,
  ): Promise<any> {
    if (!this.host) {
      await this.initialize();
    }

    const notebookPath = notebookUri.fsPath;

    // Check if we already have a worker for this notebook
    let worker = this.workers.get(notebookPath);

    if (!worker) {
      // Create a new worker by uploading notebook content
      if (notebookContent) {
        worker = await this.host.createWorker(notebookContent);
        this.workers.set(notebookPath, worker);
      } else {
        throw new Error("Cannot create worker without notebook content");
      }
    }

    // Ensure worker is connected
    if (!worker.connected) {
      await worker.connect();
    }

    return worker;
  }

  /**
   * Execute a cell
   */
  async executeCell(worker: any, cellId: string, code: string): Promise<any> {
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
  async addCell(worker: any, index: number, code: string): Promise<string> {
    const cellId = await worker.addSnippet(index, code);
    return cellId;
  }

  /**
   * Delete a cell from the notebook
   */
  async deleteCell(worker: any, cellId: string): Promise<void> {
    await worker.deleteSnippet(cellId);
  }

  /**
   * Restart the notebook kernel
   */
  async restartNotebook(worker: any): Promise<void> {
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
  onNotebookUpdate(worker: any, callback: (event: any) => void): () => void {
    return worker.onUpdate(callback);
  }
}
