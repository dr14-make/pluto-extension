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

export const activate: ActivationFunction = (context: RendererContext<void>) => {
  return {
    renderOutputItem(outputItem, element) {
      const output: PlutoOutputData = outputItem.json();

      // Render directly into the provided element
      // This ensures VS Code can properly clear/replace outputs
      render(<PlutoOutput output={output} />, element);
    },
  };
};
