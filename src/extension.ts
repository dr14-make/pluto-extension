import * as vscode from 'vscode';
import { PlutoNotebookSerializer } from './serializer';
import { PlutoNotebookController } from './controller';

export function activate(context: vscode.ExtensionContext) {
	console.log('Pluto Notebook extension is now active!');

	// Register the notebook serializer
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
			'pluto-notebook',
			new PlutoNotebookSerializer()
		)
	);

	// Register the notebook controller
	const controller = new PlutoNotebookController();
	context.subscriptions.push(controller);

	// Keep the hello world command for testing
	const disposable = vscode.commands.registerCommand('pluto-notebook.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Pluto Notebook!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
