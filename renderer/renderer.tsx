/** @jsxImportSource preact */
import type {
  ActivationFunction,
  RendererContext,
} from "vscode-notebook-renderer";
import { render } from "preact";
import { PlutoOutput } from "./components/PlutoOutput";

interface PlutoOutputData {
  mime: string;
  body: string | Uint8Array;
}

/**
 * Communication bridge for sending messages to the controller
 */
let messagingApi: RendererContext<void>["postMessage"] | undefined;

/**
 * Send a message to the notebook controller
 */
export function postMessageToController(message: any): void {
  if (messagingApi) {
    messagingApi(message);
    console.log("[RENDERER] Sent message to controller:", message);
  } else {
    console.warn("[RENDERER] Messaging API not available");
  }
}

export const activate: ActivationFunction = (
  context: RendererContext<void>
) => {
  // Store messaging API for use in components
  messagingApi = context.postMessage;

  // Listen for messages from the controller
  context.onDidReceiveMessage?.((message) => {
    console.log("[RENDERER] Received message from controller:", message);

    // Placeholder: Handle different message types from controller
    switch (message.type) {
      case "bond":
        console.log("[RENDERER] Bond received at:", message.timestamp);
        break;

      default:
        console.log("[RENDERER] Unknown message type:", message.type);
    }
  });

  return {
    renderOutputItem(outputItem, element) {
      const output: PlutoOutputData = outputItem.json();

      // Render directly into the provided element
      // This ensures VS Code can properly clear/replace outputs
      render(<PlutoOutput output={output} />, element);
    },
  };
};
