// Jest setup file for polyfills and global configurations

import { TextEncoder, TextDecoder } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Polyfill TextEncoder/TextDecoder for jsdom environment BEFORE any other imports
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill __dirname and __filename for ES modules in tests
if (typeof __dirname === "undefined") {
  global.__dirname = (url) =>
    dirname(fileURLToPath(url || "file://" + process.cwd()));
  global.__filename = (url) => fileURLToPath(url || "file://" + process.cwd());
}

// Import rainbow node polyfill after setting up global polyfills
import "@plutojl/rainbow/node-polyfill";
