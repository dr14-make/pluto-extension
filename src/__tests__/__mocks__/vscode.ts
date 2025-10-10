// Mock vscode module for Jest tests

export enum NotebookCellKind {
  Markup = 1,
  Code = 2,
}

export class NotebookCellData {
  constructor(
    public kind: NotebookCellKind,
    public value: string,
    public languageId: string,
  ) {}
}

export class NotebookData {
  constructor(public cells: NotebookCellData[]) {}
}

// Add other vscode mocks as needed
export const workspace = {
  fs: {
    readFile: () => Promise.resolve(new Uint8Array()),
    writeFile: () => Promise.resolve(),
  },
};

export const window = {
  showInformationMessage: () => Promise.resolve(),
  showErrorMessage: () => Promise.resolve(),
  showWarningMessage: () => Promise.resolve(),
};

export const Uri = {
  file: (path: string) => ({ fsPath: path, toString: () => path }),
  parse: (uri: string) => ({ fsPath: uri, toString: () => uri }),
};
