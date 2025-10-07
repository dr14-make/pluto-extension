import { postMessageToController } from "../renderer";
import {
  html,
  OutputBody,
  useRef,
  useEffect,
  get_input_value,
  setup_mathjax,
} from "@plutojl/rainbow/ui";

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
  useMathjaxEffect();
  useEffect(() => {
    const bonds = ref.current.querySelectorAll("bond");
    if (bonds.length) console.log({ bonds });
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
