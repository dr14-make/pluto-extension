/**
 * Adapter module for @plutojl/rainbow
 * Uses dynamic import since @plutojl/rainbow is an ESM module
 */
import "@plutojl/rainbow/node-polyfill";
export { parse, serialize } from "@plutojl/rainbow";
