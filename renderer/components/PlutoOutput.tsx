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

const decodeBody = (body: string | Uint8Array): string => {
  if (typeof body === "string") {
    return body;
  }
  // Handle Uint8Array or plain object that looks like Uint8Array
  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  }
  // If it's a plain object with numeric keys (serialized Uint8Array)
  if (typeof body === "object" && body !== null) {
    const arr = new Uint8Array(Object.values(body));
    return new TextDecoder().decode(arr);
  }
  return String(body);
};

export function PlutoOutput({ output }: PlutoOutputProps) {
  const ref = useRef();
  useEffect(() => {
    const bonds = ref.current.querySelectorAll("bond");
    console.log({ bonds });
    // // TODO: Set bond's value. To set it we must also get it here...
    // // Also TODO, provide pluto_actions

    // window.MathJax = {};

    // (function () {
    //   var script = document.createElement("script");
    //   script.src = "https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js";
    //   script.defer = true;
    //   document.head.appendChild(script);
    // })();
    // console.log("RENDER");
    // window.__pluto_setup_mathjax();
  }, [output]);

  // TODO workaround for images for now
  switch (output.mime) {
    case "image/png":
    case "image/jpg":
    case "image/jpeg":
    case "image/gif":
    case "image/bmp":
    case "image/svg+xml": {
      const decoded = { __html: decodeBody(output.body) };
      return html`<div ref=${ref} dangerouslySetInnerHTML="${decoded}" />`;
    }
    default: {
      return html`
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
    }
  }
}
