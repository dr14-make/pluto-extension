// Mock vscode module for Jest tests

export enum NotebookCellKind {
  Markup = 1,
  Code = 2,
}

export class NotebookCellData {
  constructor(
    public kind: NotebookCellKind,
    public value: string,
    public languageId: string
  ) {}
}

export class NotebookData {
  constructor(public cells: NotebookCellData[]) {}
}

export class NotebookCellOutputItem {
  public static json(data: any, mime?: string): NotebookCellOutputItem {
    return new NotebookCellOutputItem(
      JSON.stringify(data),
      mime ?? "application/json"
    );
  }

  constructor(
    public data: string,
    public mime: string
  ) {}
}

export class NotebookCellOutput {
  constructor(public items: NotebookCellOutputItem[]) {}
}

const promiseVoid = async (): Promise<void> => await Promise.resolve();
// Add other vscode mocks as needed
export const workspace = {
  fs: {
    readFile: async (): Promise<Uint8Array> =>
      await Promise.resolve(new Uint8Array()),
    writeFile: promiseVoid,
  },
};

export const window = {
  showInformationMessage: promiseVoid,
  showErrorMessage: promiseVoid,
  showWarningMessage: promiseVoid,
};

export const Uri = {
  file: (path: string) => ({ fsPath: path, toString: () => path }),
  parse: (uri: string) => ({ fsPath: uri, toString: () => uri }),
};
