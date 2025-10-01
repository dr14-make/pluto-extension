import * as vscode from 'vscode';
import { PlutoManager } from './plutoManager';

export class PlutoNotebookController {
    readonly controllerId = 'pluto-notebook-controller';
    readonly notebookType = 'pluto-notebook';
    readonly label = 'Pluto Notebook';
    readonly supportedLanguages = ['julia'];

    private readonly _controller: vscode.NotebookController;
    private readonly _plutoManager: PlutoManager;
    private _executionOrder = 0;
    private _workers: Map<string, any> = new Map(); // notebook URI -> Worker

    constructor() {
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);

        // Initialize Pluto manager
        this._plutoManager = new PlutoManager();
    }

    dispose(): void {
        this._controller.dispose();
        this._plutoManager.dispose();
    }

    private _execute(
        cells: vscode.NotebookCell[],
        notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): void {
        for (const cell of cells) {
            this._doExecution(cell, notebook);
        }
    }

    private async _doExecution(cell: vscode.NotebookCell, notebook: vscode.NotebookDocument): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now());

        try {
            // Get or create worker for this notebook
            let worker = this._workers.get(notebook.uri.toString());

            if (!worker) {
                // Read notebook content for initial worker creation
                const notebookContent = await this._getNotebookContent(notebook);
                worker = await this._plutoManager.getWorker(notebook.uri, notebookContent);
                this._workers.set(notebook.uri.toString(), worker);

                // Subscribe to updates
                this._plutoManager.onNotebookUpdate(worker, (event: any) => {
                    this._handleNotebookUpdate(notebook, event);
                });
            }

            // Get cell ID from metadata
            const cellId = cell.metadata?.pluto_cell_id as string;
            if (!cellId) {
                throw new Error('Cell missing Pluto cell ID');
            }

            // Execute the cell
            const code = cell.document.getText();
            const cellData = await this._plutoManager.executeCell(worker, cellId, code);

            // Format and display output
            if (cellData?.output) {
                const output = this._formatCellOutput(cellData.output);
                execution.replaceOutput([output]);
            } else {
                // No output or still running
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text('Cell executed successfully')
                    ])
                ]);
            }

            execution.end(true, Date.now());
        } catch (error) {
            console.error('Error executing cell:', error);
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error(error as Error)
                ])
            ]);
            execution.end(false, Date.now());
        }
    }

    private async _getNotebookContent(notebook: vscode.NotebookDocument): Promise<string> {
        // Read the raw notebook file content
        try {
            const fileContent = await vscode.workspace.fs.readFile(notebook.uri);
            return new TextDecoder().decode(fileContent);
        } catch (error) {
            console.error('Error reading notebook file:', error);
            // Fallback: serialize current notebook state
            return '### A Pluto.jl notebook ###\n# v0.19.0\n';
        }
    }

    private _formatCellOutput(output: any): vscode.NotebookCellOutput {
        // Handle different output types from Pluto
        if (output.body) {
            // HTML output
            return new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(output.body, 'text/html')
            ]);
        } else if (output.text) {
            // Text output
            return new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(output.text)
            ]);
        } else if (output.error) {
            // Error output
            return new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.error(new Error(output.error))
            ]);
        } else {
            // Fallback: stringify the output
            return new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(JSON.stringify(output, null, 2))
            ]);
        }
    }

    private _handleNotebookUpdate(notebook: vscode.NotebookDocument, event: any): void {
        // Handle real-time updates from Pluto server
        // This could update cell outputs, execution states, etc.
        console.log('Notebook update:', event);

        // TODO: Implement update handling based on event type
        // For example:
        // - cell_updated: update specific cell output
        // - cells_added: add new cells
        // - cells_deleted: remove cells
        // - notebook_restarted: clear all outputs
    }
}
