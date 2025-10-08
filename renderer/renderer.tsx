/** @jsxImportSource preact */
import type {
  ActivationFunction,
  RendererContext,
} from "vscode-notebook-renderer";
import { PlutoOutput } from "./components/PlutoOutput";
import { html, PlutoActionsContext, render } from "@plutojl/rainbow/ui";
import { CellResultData } from "@plutojl/rainbow";

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
  return {
    renderOutputItem(outputItem, element) {
      const state: CellResultData = outputItem.json();
      // Render directly into the provided element
      // This ensures VS Code can properly clear/replace outputs
      const actions = {
        get_notebook: () => ({}),
        request_js_link_response: () => {},
        update_notebook: () => {},
        set_bond: (name: string, value: any) => {
          postMessageToController({
            type: "bond",
            name,
            value,
            cell_id: state.cell_id,
          });
        },
      };
      render(
        html`<${PlutoActionsContext.Provider} value=${actions}>
          <${PlutoOutput} state="${state}"  context=${context} />
        </${PlutoActionsContext.Provider}>`,
        element
      );
    },
  };
};
