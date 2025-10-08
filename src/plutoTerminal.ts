import * as vscode from "vscode";
import { PlutoManager } from "./plutoManager.ts";

/**
 * Pluto Terminal - An interactive terminal for executing Julia code in Pluto notebooks
 * Uses executeCodeEphemeral to run code without creating persistent cells
 */
export class PlutoTerminalProvider implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;

  private closeEmitter = new vscode.EventEmitter<number | void>();
  onDidClose?: vscode.Event<number | void> = this.closeEmitter.event;

  private notebookPath?: string;
  private inputBuffer = "";
  private isExecuting = false;

  constructor(
    private plutoManager: PlutoManager,
    private outputChannel: vscode.OutputChannel
  ) {}

  /**
   * Called when the terminal is opened
   */
  async open(
    initialDimensions: vscode.TerminalDimensions | undefined
  ): Promise<void> {
    this.writeWelcomeMessage();

    // Try to bind to an open notebook
    await this.bindToNotebook();
  }

  /**
   * Write welcome message with ANSI colors
   */
  private writeWelcomeMessage(): void {
    this.write(
      "\x1b[1;36m╔═══════════════════════════════════════╗\x1b[0m\r\n"
    );
    this.write(
      "\x1b[1;36m║      Pluto Notebook Terminal          ║\x1b[0m\r\n"
    );
    this.write(
      "\x1b[1;36m╚═══════════════════════════════════════╝\x1b[0m\r\n\r\n"
    );
  }

  /**
   * Bind terminal to a notebook session
   */
  private async bindToNotebook(): Promise<void> {
    const notebooks = this.plutoManager.getOpenNotebooks();

    if (notebooks.length === 0) {
      // No notebooks open - ask user if they want to create one
      this.write("\x1b[33mNo notebooks currently open.\x1b[0m\r\n");
      this.write("Would you like to:\r\n");
      this.write("  1. Create a new notebook\r\n");
      this.write("  2. Open an existing notebook\r\n");
      this.write(
        "  3. Continue without a notebook (limited functionality)\r\n\r\n"
      );

      const choice = await vscode.window.showQuickPick(
        [
          { label: "Create New Notebook", value: "create" },
          { label: "Open Existing Notebook", value: "open" },
          { label: "Continue Without Notebook", value: "none" },
        ],
        { placeHolder: "Select an option" }
      );

      if (choice?.value === "create") {
        await this.createNewNotebook();
      } else if (choice?.value === "open") {
        await this.openExistingNotebook();
      } else {
        this.write("\x1b[33mContinuing without a notebook.\x1b[0m\r\n");
        this.write("\x1b[33mSome features may be limited.\x1b[0m\r\n\r\n");
      }
    } else if (notebooks.length === 1) {
      // One notebook - automatically bind to it
      this.notebookPath = notebooks[0].path;
      this.write(
        `\x1b[32m✓ Connected to notebook: ${this.getNotebookName()}\x1b[0m\r\n\r\n`
      );
    } else {
      // Multiple notebooks - ask user to select
      const items = notebooks.map((nb) => ({
        label: this.getNotebookNameFromPath(nb.path),
        description: nb.path,
        value: nb.path,
      }));

      const choice = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a notebook to connect to",
      });

      if (choice) {
        this.notebookPath = choice.value;
        this.write(
          `\x1b[32m✓ Connected to notebook: ${choice.label}\x1b[0m\r\n\r\n`
        );
      } else {
        this.write("\x1b[33mNo notebook selected.\x1b[0m\r\n\r\n");
      }
    }

    this.writePrompt();
  }

  /**
   * Create a new notebook
   */
  private async createNewNotebook(): Promise<void> {
    try {
      const uri = await vscode.window.showSaveDialog({
        filters: { "Pluto Notebooks": ["pluto.jl", "dyad.jl"] },
        defaultUri: vscode.Uri.file("Untitled.pluto.jl"),
      });

      if (uri) {
        // Create minimal Pluto notebook
        const minimalNotebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ Cell order:
# ╠═`;

        await vscode.workspace.fs.writeFile(
          uri,
          Buffer.from(minimalNotebook, "utf-8")
        );

        // Open the notebook in VSCode
        const doc = await vscode.workspace.openNotebookDocument(uri);
        await vscode.window.showNotebookDocument(doc);

        // Bind to it
        this.notebookPath = uri.fsPath;
        this.write(
          `\x1b[32m✓ Created and connected to: ${this.getNotebookName()}\x1b[0m\r\n\r\n`
        );
      }
    } catch (error) {
      this.write(`\x1b[31mError creating notebook: ${error}\x1b[0m\r\n\r\n`);
    }
  }

  /**
   * Open an existing notebook
   */
  private async openExistingNotebook(): Promise<void> {
    try {
      const uris = await vscode.window.showOpenDialog({
        filters: { "Pluto Notebooks": ["pluto.jl", "dyad.jl", "jl"] },
        canSelectMany: false,
      });

      if (uris && uris[0]) {
        const doc = await vscode.workspace.openNotebookDocument(uris[0]);
        await vscode.window.showNotebookDocument(doc);

        this.notebookPath = uris[0].fsPath;
        this.write(
          `\x1b[32m✓ Opened and connected to: ${this.getNotebookName()}\x1b[0m\r\n\r\n`
        );
      }
    } catch (error) {
      this.write(`\x1b[31mError opening notebook: ${error}\x1b[0m\r\n\r\n`);
    }
  }

  /**
   * Get notebook name from path
   */
  private getNotebookName(): string {
    return this.notebookPath
      ? this.getNotebookNameFromPath(this.notebookPath)
      : "Unknown";
  }

  private getNotebookNameFromPath(path: string): string {
    return path.split("/").pop() || path;
  }

  /**
   * Write to terminal with \r\n line endings
   */
  private write(text: string): void {
    this.writeEmitter.fire(text);
  }

  /**
   * Write prompt
   */
  private writePrompt(): void {
    if (this.isExecuting) {
      return;
    }
    this.write("\x1b[1;32mjulia>\x1b[0m ");
  }

  /**
   * Handle input from the user
   */
  handleInput(data: string): void {
    // Handle special keys
    if (data === "\r") {
      // Enter key - execute command
      this.write("\r\n");
      const command = this.inputBuffer.trim();
      this.inputBuffer = "";

      if (command) {
        this.executeCommand(command);
      } else {
        this.writePrompt();
      }
    } else if (data === "\x7f") {
      // Backspace
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.write("\x1b[D \x1b[D"); // Move back, write space, move back again
      }
    } else if (data === "\x03") {
      // Ctrl+C - interrupt
      if (this.isExecuting) {
        this.write("\r\n\x1b[31m^C\x1b[0m\r\n");
        this.isExecuting = false;
        // TODO: Add interrupt support
        this.writePrompt();
      } else {
        this.inputBuffer = "";
        this.write("\r\n");
        this.writePrompt();
      }
    } else {
      // Regular character
      this.inputBuffer += data;
      this.write(data);
    }
  }

  /**
   * Execute Julia code in the notebook
   */
  private async executeCommand(code: string): Promise<void> {
    if (this.isExecuting) {
      this.write("\x1b[33mAlready executing...\x1b[0m\r\n");
      return;
    }

    // Handle special commands
    if (code.startsWith(".")) {
      await this.handleSpecialCommand(code);
      return;
    }

    if (!this.notebookPath) {
      this.write("\x1b[31mError: Not connected to a notebook.\x1b[0m\r\n");
      this.write("Use .connect to connect to a notebook.\r\n\r\n");
      this.writePrompt();
      return;
    }

    this.isExecuting = true;

    try {
      // Ensure server is running
      if (!this.plutoManager.isRunning()) {
        this.write("\x1b[33mStarting Pluto server...\x1b[0m\r\n");
        await this.plutoManager.start();
        this.write("\x1b[32m✓ Server started\x1b[0m\r\n\r\n");
      }

      // Get worker from PlutoManager (it handles creation/caching)
      const worker = await this.plutoManager.getWorker(this.notebookPath);

      if (!worker) {
        throw new Error("Failed to get worker for notebook");
      }

      // Execute code ephemerally using PlutoManager
      const result = await this.plutoManager.executeCodeEphemeral(worker, code);

      // Render output
      await this.renderOutput(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.write(`\x1b[31mError: ${errorMessage}\x1b[0m\r\n`);
      this.outputChannel.appendLine(
        `Terminal execution error: ${errorMessage}`
      );
    } finally {
      this.isExecuting = false;
      this.write("\r\n");
      this.writePrompt();
    }
  }

  /**
   * Render cell output with support for various MIME types
   */
  private async renderOutput(result: any): Promise<void> {
    if (!result || !result.output) {
      return;
    }

    const { mime, body } = result.output;

    if (!mime || body === null || body === undefined) {
      return;
    }

    try {
      switch (mime) {
        case "text/plain":
          this.renderTextOutput(body);
          break;

        case "text/html":
          this.renderHtmlOutput(body);
          break;

        case "image/png":
        case "image/jpeg":
        case "image/gif":
        case "image/svg+xml":
          await this.renderImageOutput(mime, body);
          break;

        case "application/json":
          this.renderJsonOutput(body);
          break;

        default:
          // Fallback to text representation
          this.write(`\x1b[33m[Output: ${mime}]\x1b[0m\r\n`);
          if (typeof body === "string") {
            this.renderTextOutput(body);
          } else {
            this.renderTextOutput(JSON.stringify(body, null, 2));
          }
      }
    } catch (error) {
      this.write(`\x1b[31mError rendering output: ${error}\x1b[0m\r\n`);
    }
  }

  /**
   * Render plain text output
   */
  private renderTextOutput(text: string): void {
    const lines = text.split("\n");
    for (const line of lines) {
      this.write(line + "\r\n");
    }
  }

  /**
   * Render HTML output (simplified - extract text)
   */
  private renderHtmlOutput(html: string): void {
    // Strip HTML tags for terminal display
    const text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<p[^>]*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();

    this.write(`\x1b[36m[HTML Output]\x1b[0m\r\n`);
    this.renderTextOutput(text);

    // Offer to open in external viewer
    this.write(
      `\x1b[2m(Use .view to open HTML output in external viewer)\x1b[0m\r\n`
    );
  }

  /**
   * Render image output
   */
  private async renderImageOutput(mime: string, body: any): Promise<void> {
    try {
      // Images can't be displayed directly in terminal
      // Show a message and offer to save/open
      this.write(`\x1b[36m[Image Output: ${mime}]\x1b[0m\r\n`);
      this.write(
        `\x1b[2m(Images cannot be displayed in terminal. Use .save to save the image)\x1b[0m\r\n`
      );

      // Optionally, automatically show in VSCode's image viewer
      const show = await vscode.window.showInformationMessage(
        "Image output generated. Would you like to view it?",
        "View",
        "Dismiss"
      );

      if (show === "View") {
        // Create temporary file and open it
        const ext = mime.split("/")[1];
        const tmpUri = vscode.Uri.file(`/tmp/pluto-output.${ext}`);

        let buffer: Buffer;
        if (typeof body === "string") {
          // Base64 encoded
          buffer = Buffer.from(body, "base64");
        } else if (body instanceof Uint8Array) {
          buffer = Buffer.from(body);
        } else {
          throw new Error("Unsupported image body format");
        }

        await vscode.workspace.fs.writeFile(tmpUri, buffer);
        await vscode.commands.executeCommand("vscode.open", tmpUri);
      }
    } catch (error) {
      this.write(`\x1b[31mError displaying image: ${error}\x1b[0m\r\n`);
    }
  }

  /**
   * Render JSON output
   */
  private renderJsonOutput(json: any): void {
    this.write(`\x1b[36m[JSON Output]\x1b[0m\r\n`);
    const formatted =
      typeof json === "string" ? json : JSON.stringify(json, null, 2);
    this.renderTextOutput(formatted);
  }

  /**
   * Handle special terminal commands (starting with .)
   */
  private async handleSpecialCommand(command: string): Promise<void> {
    const cmd = command.toLowerCase().trim();

    switch (cmd) {
      case ".help":
        this.showHelp();
        break;

      case ".connect":
        await this.bindToNotebook();
        return;

      case ".disconnect":
        if (this.notebookPath) {
          // Note: PlutoManager keeps the worker alive for the notebook
          // We just remove our reference to it
          this.notebookPath = undefined;
          this.write("\x1b[33m✓ Disconnected from notebook\x1b[0m\r\n\r\n");
        } else {
          this.write("\x1b[33mNot connected to any notebook\x1b[0m\r\n\r\n");
        }
        break;

      case ".notebooks":
        this.listNotebooks();
        break;

      case ".clear":
        this.write("\x1b[2J\x1b[H"); // Clear screen and move cursor to top
        this.writeWelcomeMessage();
        break;

      case ".status":
        this.showStatus();
        break;

      default:
        this.write(`\x1b[31mUnknown command: ${cmd}\x1b[0m\r\n`);
        this.write("Type .help for available commands\r\n\r\n");
    }

    this.writePrompt();
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    this.write("\x1b[1;36mPluto Terminal Commands:\x1b[0m\r\n");
    this.write("  .help        - Show this help message\r\n");
    this.write("  .connect     - Connect to a notebook\r\n");
    this.write("  .disconnect  - Disconnect from current notebook\r\n");
    this.write("  .notebooks   - List open notebooks\r\n");
    this.write("  .status      - Show terminal status\r\n");
    this.write("  .clear       - Clear the terminal\r\n");
    this.write("\r\n");
    this.write("\x1b[1;36mTips:\x1b[0m\r\n");
    this.write("  - Type Julia code to execute it in the notebook\r\n");
    this.write("  - Press Ctrl+C to cancel current execution\r\n");
    this.write("  - Code is executed ephemerally (no cells created)\r\n");
    this.write("\r\n");
  }

  /**
   * List open notebooks
   */
  private listNotebooks(): void {
    const notebooks = this.plutoManager.getOpenNotebooks();

    if (notebooks.length === 0) {
      this.write("\x1b[33mNo notebooks currently open\x1b[0m\r\n\r\n");
      return;
    }

    this.write("\x1b[1;36mOpen Notebooks:\x1b[0m\r\n");
    for (const nb of notebooks) {
      const name = this.getNotebookNameFromPath(nb.path);
      const isConnected =
        nb.path === this.notebookPath ? " \x1b[32m✓\x1b[0m" : "";
      this.write(`  - ${name}${isConnected}\r\n`);
      this.write(`    \x1b[2m${nb.path}\x1b[0m\r\n`);
    }
    this.write("\r\n");
  }

  /**
   * Show terminal status
   */
  private showStatus(): void {
    this.write("\x1b[1;36mTerminal Status:\x1b[0m\r\n");

    // Server status from PlutoManager
    const serverStatus = this.plutoManager.isRunning();
    const serverConnected = this.plutoManager.isConnected();

    this.write(
      `  Server: ${
        serverStatus ? "\x1b[32mRunning\x1b[0m" : "\x1b[31mStopped\x1b[0m"
      }\r\n`
    );
    this.write(
      `  Server Connected: ${
        serverConnected ? "\x1b[32mYes\x1b[0m" : "\x1b[31mNo\x1b[0m"
      }\r\n`
    );
    this.write(`  Server URL: ${this.plutoManager.getServerUrl()}\r\n`);
    this.write(
      `  Notebook Bound: ${
        this.notebookPath ? "\x1b[32mYes\x1b[0m" : "\x1b[31mNo\x1b[0m"
      }\r\n`
    );
    if (this.notebookPath) {
      this.write(`  Notebook Path: ${this.notebookPath}\r\n`);
      this.write(`  Notebook Name: ${this.getNotebookName()}\r\n`);
    }
    this.write(
      `  Executing: ${
        this.isExecuting ? "\x1b[33mYes\x1b[0m" : "\x1b[32mNo\x1b[0m"
      }\r\n`
    );

    // Show open notebooks count
    const openNotebooks = this.plutoManager.getOpenNotebooks();
    this.write(`  Open Notebooks: ${openNotebooks.length}\r\n`);

    this.write("\r\n");
  }

  /**
   * Close the terminal
   */
  close(): void {
    this.closeEmitter.fire();
  }
}

/**
 * Create and show a Pluto terminal
 */
export function createPlutoTerminal(
  plutoManager: PlutoManager,
  outputChannel: vscode.OutputChannel
): vscode.Terminal {
  const pty = new PlutoTerminalProvider(plutoManager, outputChannel);

  const terminal = vscode.window.createTerminal({
    name: "Pluto Terminal",
    pty,
    iconPath: new vscode.ThemeIcon("symbol-namespace"),
  });

  terminal.show();
  return terminal;
}
