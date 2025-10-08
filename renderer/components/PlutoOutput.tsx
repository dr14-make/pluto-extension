import {
  CellResultData,
  PROGRESS_LOG_LEVEL,
  STDOUT_LOG_LEVEL,
  Worker,
} from "@plutojl/rainbow";

import {
  html,
  OutputBody,
  useEffect,
  setup_mathjax,
  useState,
} from "@plutojl/rainbow/ui";
import { type RendererContext } from "vscode-notebook-renderer";

const useMathjaxEffect = () =>
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "pluto-external-source";
    link.id = "MathJax-script";
    link.href =
      "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg-full.js";
    link.type = "text/javascript";
    document.head.appendChild(link);
    setup_mathjax();
  }, []);

/** @jsxImportSource preact */

interface PlutoOutputProps {
  state: CellResultData;
  context: RendererContext<void>;
}
const cutMime = (s: { msg: string }) => {
  return s.msg.slice(0, s.msg.lastIndexOf(","));
};
export function PlutoOutput({ state, context }: PlutoOutputProps) {
  useMathjaxEffect();
  const [localState, setLocalState] = useState(state);
  const [progress, setProgress] = useState<any>(null);
  const [terminal, setTerminal] = useState<any>(null);
  const [logs, setLogs] = useState<any>(null);
  useEffect(() => {
    // Listen for messages from the controller
    const d = context.onDidReceiveMessage?.((message) => {
      if (message.cell_id !== state.cell_id) {
        return;
      }
      // Placeholder: Handle different message types from controller
      switch (message.type) {
        case "setState": {
          const state = message.state as CellResultData;
          setLocalState(state);
          state; // fake worker

          const logs = state.logs.filter((log) => {
            return (
              log.level.toString() !== PROGRESS_LOG_LEVEL &&
              log.level.toString() !== STDOUT_LOG_LEVEL
            );
          });
          const stdout = state.logs.filter((log) => {
            return log.level.toString() === STDOUT_LOG_LEVEL;
          });
          const prog = state.logs.filter((log) => {
            return log.level.toString() === PROGRESS_LOG_LEVEL;
          });
          setLogs(logs);
          setTerminal(stdout);
          // TODO: This is more sophisticated; it has mime type in
          const result = prog[prog.length - 1]?.kwargs?.[0]?.[1]?.[0];
          setProgress(100 * parseFloat(result === "done" ? "1" : result));
        }
        case "bond":
          break;
        default:
          console.log("[RENDERER] Unknown message type:", message.type);
      }
    });
    return () => d?.dispose();
  }, [state.cell_id, context]);

  return html`
  ${
    state.running && progress
      ? html`<div>
          <label for=${`progress_${state.cell_id}`}> ${progress}% </label
          ><progress
            style="width: 240px;"
            id=${`progress_${state.cell_id}`}
            max="100"
            value=${progress}
          ></progress>
        </div>`
      : null
  }
  <${OutputBody}
    cell_id=${state.cell_id}
    persist_js_state="${false}"
    body="${localState.output?.body}"
    mime="${localState.output?.mime}"
    sanitize_html="${false}"
  ></${OutputBody}>
  ${
    terminal?.length
      ? html`<details open>
          <summary>stdout</summary>
          <pre>${terminal.map(cutMime).join("\n")}</pre>
        </details>`
      : null
  }
  ${
    logs?.length
      ? html`<details open>
          <summary>Logs</summary>
          <pre>${logs.map(cutMime).join("\n")}</pre>
        </details>`
      : null
  }`;
}
