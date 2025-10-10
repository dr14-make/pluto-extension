// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Baseline: Downgrade existing violations to warnings
      // Current baseline: 14 errors (13 no-explicit-any + 1 no-control-regex)
      // New violations will increase warning count and fail CI with --max-warnings=14
      "@typescript-eslint/no-explicit-any": "warn",
      "no-control-regex": "warn",
    },
  }
);
