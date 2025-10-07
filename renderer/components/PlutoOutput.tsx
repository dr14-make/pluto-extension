import {
  html,
  OutputBody,
  useEffect,
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

export function PlutoOutput({ output }: PlutoOutputProps) {
  useMathjaxEffect();
  return html`
  <${OutputBody}
    cell_id=""
    last_run_timestamp="${0}"
    persist_js_state="${false}"
    body="${output.body}"
    mime="${output.mime}"
    sanitize_html="${false}"
  ></${OutputBody}>`;
}
