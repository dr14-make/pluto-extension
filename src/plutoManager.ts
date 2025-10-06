import "@plutojl/rainbow/node-polyfill";
import * as vscode from "vscode";
import { CellResultData, Host, UpdateEvent, Worker } from "@plutojl/rainbow";
import { ChildProcess, spawn } from "child_process";
/**
 * Manages connection to Pluto server and notebook sessions
 */
export class PlutoManager {
  private host?: Host; // Host from @plutojl/rainbow
  private workers: Map<string, Worker> = new Map(); // notebook_id -> Worker
  private serverUrl: string;
  private juliaProcess?: ChildProcess;

  constructor(
    private port: number = 1234,
    private outputChannel: vscode.OutputChannel
  ) {
    this.serverUrl = `http://localhost:${port}`;
  }

  /**
   * Check if Pluto server is running
   */
  isRunning(): boolean {
    return !!this.juliaProcess && !!this.host;
  }

  /**
   * Log message to output channel
   */
  log(message: string): void {
    this.outputChannel.appendLine(message);
  }

  /**
   * Start Pluto server
   */
  async start(): Promise<void> {
    if (this.juliaProcess) {
      this.outputChannel.appendLine("Pluto server is already running");
      return;
    }

    this.outputChannel.appendLine(
      `Starting Pluto server on port ${this.port}...`
    );

    try {
      this.juliaProcess = await this.runServer(this.port);
      this.outputChannel.appendLine("Pluto server started successfully!");

      // Pipe Julia stdout to output channel
      this.juliaProcess.stdout?.on("data", (data) => {
        this.outputChannel.append(data.toString());
      });

      // Pipe Julia stderr to output channel
      this.juliaProcess.stderr?.on("data", (data) => {
        this.outputChannel.append(data.toString());
      });

      // Handle process exit
      this.juliaProcess.on("exit", (code) => {
        this.outputChannel.appendLine(
          `Pluto server exited with code ${code ?? "unknown"}`
        );

        // Show warning if server exits unexpectedly
        if (code !== 0 && code !== null) {
          vscode.window.showWarningMessage(
            `Pluto server stopped unexpectedly with exit code ${code}`
          );
        }

        this.juliaProcess = undefined;
        this.host = undefined;
      });

      // Initialize host connection
      this.host = new Host(this.serverUrl);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(
        `Failed to start Pluto server: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Stop Pluto server
   */
  async stop(): Promise<void> {
    if (!this.juliaProcess) {
      this.outputChannel.appendLine("Pluto server is not running");
      return;
    }

    this.outputChannel.appendLine("Stopping Pluto server...");

    // Close all workers
    for (const worker of this.workers.values()) {
      worker.close();
    }
    this.workers.clear();

    // Kill Julia process
    this.juliaProcess.kill();
    this.juliaProcess = undefined;
    this.host = undefined;

    this.outputChannel.appendLine("Pluto server stopped");
  }

  /**
   * Restart Pluto server
   */
  async restart(): Promise<void> {
    this.outputChannel.appendLine("Restarting Pluto server...");
    await this.stop();
    await this.start();
  }

  private runServer(port: number = 1234): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const julia = spawn("julia", [
        "-e",
        `using Pluto;Pluto.run(port=${port};require_secret_for_open_links=false, require_secret_for_access=false, launch_browser=false)`,
      ]);

      julia.stdout?.on("data", (data) => {
        this.outputChannel.append(`[Server Init] ${data}`);
        if (data.toString().includes("Go to")) {
          resolve(julia);
        }
      });

      julia.stderr?.on("data", (data) => {
        this.outputChannel.append(`[Server Init] ${data}`);
        if (data.toString().includes("Go to")) {
          resolve(julia);
        }
      });

      julia.on("error", (error) => {
        this.outputChannel.appendLine(`[Server Init Error] ${error.message}`);
        setTimeout(() => reject(error), 1000);
      });
    });
  }

  /**
   * Get or create a worker for a notebook
   */
  async getWorker(notebookUri: vscode.Uri): Promise<Worker | undefined> {
    if (!this.host) {
      await this.start();
    }

    const notebookPath = notebookUri.fsPath;

    // Check if we already have a worker for this notebook
    let worker = this.workers.get(notebookPath);

    if (!worker && this.host) {
      // Read notebook content from file
      let notebookContent: string;
      try {
        const fileContent = await vscode.workspace.fs.readFile(notebookUri);
        notebookContent = new TextDecoder().decode(fileContent);
        worker = await this.host.createWorker(notebookContent.trim());
        this.workers.set(notebookPath, worker);
      } catch (error) {
        this.outputChannel.appendLine(`Error reading notebook file: ${error}`);
        throw new Error(`Cannot create worker: failed to read notebook file`);
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
      const result = await worker.updateSnippetCode(cellId, code, true);

      // Wait for execution to complete
      // await worker.wait(true);

      // Get cell result
      const cellData = worker.getSnippet(cellId);
      return cellData?.results ?? null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[Cell Execution Error] ${errorMessage}`);
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

    // Kill Julia process
    if (this.juliaProcess) {
      this.juliaProcess.kill();
    }
  }
}
