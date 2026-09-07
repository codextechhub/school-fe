import { defineConfig } from "vitest/config";

import { resolveAlias } from "./vite.config";

export default defineConfig({
  // esbuild does not read tsconfig's jsx setting for files under
  // node_modules; without this every package component throws
  // "React is not defined" at render.
  esbuild: { jsx: "automatic" },
  resolve: {
    // See tsconfig: symlinked sibling checkout.
    preserveSymlinks: true,
    // The dev server's own table, not a copy of it. See vite.config.ts.
    alias: resolveAlias,
  },
  test: {
    // happy-dom provides document.cookie / sessionStorage / localStorage for
    // the auth-session utilities under test.
    environment: "happy-dom",
    // Discovery skips node_modules by default; the package lives there now.
    exclude: ["**/dist/**", "**/node_modules/**/node_modules/**"],
    include: [
      "node_modules/@xvs/finance/src/**/*.test.{ts,tsx}","src/**/*.test.{ts,tsx}"],
    env: {
      VITE_BACKEND_URL: "http://test.local/v1",
    },
  },
});
