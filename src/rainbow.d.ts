declare module '@plutojl/rainbow/node-polyfill';
declare module '@plutojl/rainbow' {
  export function parse(content: string): any;
  export function serialize(data: any): string;
  export class Host {
    constructor(serverUrl: string);
    createWorker(notebookContent: string): Promise<any>;
  }
}
