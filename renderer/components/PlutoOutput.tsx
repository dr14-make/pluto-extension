import { postMessageToController } from "../renderer";
import {
  html,
  OutputBody,
  useRef,
  useEffect,
  get_input_value,
} from "@plutojl/rainbow/ui";

/** @jsxImportSource preact */

interface PlutoOutputProps {
  output: {
    mime: string;
    body: string | Uint8Array;
  };
}

export function PlutoOutput({ output }: PlutoOutputProps) {
  const ref = useRef();
  useEffect(() => {
    const bonds = ref.current.querySelectorAll("bond");
    console.log({ bonds });
    // TODO: Set bond's value. To set it we must also get it here...
    // Also TODO, provide pluto_actions
  }, [output]);

  const result = html`
  <div ref=${ref} onInput=${(e: InputEvent) => {
    if (e.target) {
      postMessageToController({
        type: "bond",
        name: e.target.parentNode.attributes["def"].value,
        value: get_input_value(e.target),
      });
    }
  }}>
  <${OutputBody}
    cell_id=""
    last_run_timestamp="${0}"
    persist_js_state="${false}"
    body="${output.body}"
    mime="${output.mime}"
    sanitize_html="${false}"
  ></${OutputBody}></div>`;

  return result;
}
