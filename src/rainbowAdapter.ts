/**
 * Adapter module for @plutojl/rainbow
 * Uses dynamic import since @plutojl/rainbow is an ESM module
 */
import "@plutojl/rainbow/node-polyfill";
let rainbowModule: any = null;

async function loadRainbow() {
  if (!rainbowModule) {
    rainbowModule = await import("@plutojl/rainbow");
  }
  return rainbowModule;
}

export async function parse(content: string): Promise<any> {
  const rainbow = await loadRainbow();
  return rainbow.parse(content);
}

export async function serialize(notebookData: any): Promise<string> {
  const rainbow = await loadRainbow();
  return rainbow.serialize(notebookData);
}
