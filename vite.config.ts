import path from "path"
import { realpathSync } from "node:fs"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = (...segments: string[]) =>
  path.resolve(__dirname, "./node_modules/@xvs/finance", ...segments)

// Where the package really lives. `npm link` makes node_modules/@xvs/finance a
// symlink to a sibling checkout, and Vite refuses to serve any file outside the
// project root, so that location has to be named in server.fs.allow or every
// finance module 403s in the dev server. On a normal install this resolves back
// inside node_modules and the entry costs nothing.
const packageRoot = (() => {
  try {
    return realpathSync(pkg())
  } catch {
    return pkg()
  }
})()

// Specifiers the shared package writes as `@/…` and this app redirects into
// @xvs/finance. Aliasing them is only half the job - see PACKAGE_SPECIFIERS
// below for the half that bites.
const packageAlias: { find: string; replacement: string }[] = [
  { find: "@/components/finance-ui", replacement: pkg("src/components/finance-ui") },
  { find: "@/redux/services/finance", replacement: pkg("src/redux/services/finance") },
  { find: "@/redux/services/procurement", replacement: pkg("src/redux/services/procurement") },
  { find: "@/redux/services/payments", replacement: pkg("src/redux/services/payments") },
  { find: "@/redux/services/tenants-api", replacement: pkg("src/redux/services/tenants-api.ts") },
  { find: "@/redux/features/finance", replacement: pkg("src/redux/features/finance") },
  { find: "@/pages/protected/data-imports", replacement: pkg("src/pages/data-imports") },
  { find: "@/pages/protected/export", replacement: pkg("src/pages/export") },
  { find: "@/pages/protected/finance", replacement: pkg("src/pages/finance") },
  { find: "@/pages/protected/procurement", replacement: pkg("src/pages/procurement") },
  { find: "@/pages/protected/workflow/components", replacement: pkg("src/components/workflow") },
  { find: "@/pages/protected/workflow/approvals", replacement: pkg("src/pages/workflow/approvals") },
  { find: "@/pages/protected/workflow/my-submissions", replacement: pkg("src/pages/workflow/my-submissions") },
  { find: "@/pages/protected/workflow/instances", replacement: pkg("src/pages/workflow/instances") },
  { find: "@/pages/protected/workflow/approver-groups", replacement: pkg("src/pages/workflow/approver-groups") },
  { find: "@/pages/protected/workflow/templates", replacement: pkg("src/pages/workflow/templates") },
  { find: "@/redux/services/workflow", replacement: pkg("src/redux/services/workflow") },
  { find: "@/pages/protected/workflow/delegations", replacement: pkg("src/pages/workflow/delegations") },
  { find: "@/utils/relative-date", replacement: pkg("src/utils/relative-date.ts") },
  { find: "@/utils/money", replacement: pkg("src/utils/money.ts") },
  { find: "@/utils/posting-window", replacement: pkg("src/utils/posting-window.ts") },
  { find: "@/utils/quantity", replacement: pkg("src/utils/quantity.ts") },
  { find: "@/utils/fls", replacement: pkg("src/utils/fls.ts") },
  { find: "@/utils/finance-export", replacement: path.resolve(__dirname, "./src/xvs-host/finance-export.ts") },
  { find: "@/utils/finance-documents", replacement: path.resolve(__dirname, "./src/xvs-host/finance-documents.ts") },
  { find: "@/utils/chart-of-accounts", replacement: pkg("src/utils/chart-of-accounts.ts") },
  { find: "@/hooks/use-action-param", replacement: pkg("src/hooks/use-action-param.ts") },
  { find: "@/lib/source-document-route", replacement: pkg("src/lib/source-document-route.ts") },
  { find: "@xvs/finance", replacement: pkg("src") },
]

// Every aliased specifier ALSO has to be excluded from pre-bundling, and the
// exclusion is derived from the alias table rather than typed out again so the
// two can never drift.
//
// Why it matters: the alias targets live under node_modules, so Vite's scanner
// classifies them as dependencies and pre-bundles them - and a pre-bundled
// chunk inlines its own copy of everything it imports, including
// `@/redux/services/base-api`. The finance endpoints then inject into a SECOND
// RTK Query instance that this app's store never registered. Nothing throws:
// every finance hook simply returns `{ data: undefined }` and issues no
// request, which on screen is "Select an entity" with an empty network tab.
//
// `exclude: ["@xvs/finance"]` alone does not cover this. The specifier the
// package actually writes is `@/redux/services/finance/entity-api`, so the
// package name never appears in the import graph and never matches.
const PACKAGE_SPECIFIERS = packageAlias.map((entry) => entry.find)

// Runtime dependencies the shared package imports and this app's own source
// never does. Vite decides what to pre-bundle by scanning THIS app's imports, so
// a package-only dependency is never bundled, and with `preserveSymlinks` a bare
// import from an npm-linked package resolves upward from the sibling checkout,
// which carries no node_modules of its own. The screen then dies on load with
// "failed to resolve import" while the installed setup, where the package sits
// inside node_modules, works perfectly. Naming them here pre-bundles them out of
// this app's own node_modules, where they are installed, so both setups resolve.
const PACKAGE_ONLY_DEPS = ["date-fns"]

const authBoundaryPlugin = () => ({
  name: "xvs-auth-boundary",
  enforce: "pre" as const,
  resolveId(source: string, importer?: string) {
    if (
      importer?.includes("/pages/data-imports/batches/")
      && (source === "./batch-utils" || source === "./components/batch-utils")
    ) {
      return path.resolve(__dirname, "./src/xvs-host/import-batch-utils.ts")
    }
    return null
  },
})

/**
 * How every `@/…` specifier resolves, for the dev server, the build AND the
 * test runner.
 *
 * Exported because vitest.config.ts consumes it rather than keeping a second
 * copy. Two hand-maintained tables drifted by eight entries, and the drift is
 * invisible until a test happens to import one of the missing modules: the app
 * ran, the build shipped, and the suite failed to resolve `@/utils/relative-date`
 * the first time anything under test reached the notification bell. A test
 * runner that resolves imports differently from the thing it is testing is not
 * testing that thing.
 */
export const resolveAlias = [
  { find: "@xvs-host", replacement: path.resolve(__dirname, "./src/xvs-host.tsx") },
  // The barrel is a file, not the directory of the same name; it has to be
  // matched exactly and before the directory rule.
  { find: /^@\/components\/finance-ui$/, replacement: pkg("src/components/finance-ui/index.ts") },
  ...packageAlias,
  { find: "@/routes/routes-path", replacement: path.resolve(__dirname, "./src/routes/routesPath.ts") },
  { find: "@", replacement: path.resolve(__dirname, "./src") },
]

// https://vite.dev/config/
export default defineConfig({
  // Fixed port so the two apps can run side by side: 5174 is the school app.
  // Without this both default to 5173 and whichever starts second silently
  // moves to the next free port, which breaks any link built against it.
  // strictPort makes that failure loud instead of silent.
  server: { port: 5174, strictPort: true, fs: { allow: [__dirname, packageRoot] } },
  plugins: [
    authBoundaryPlugin(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],
  // Source, not a built dependency: it resolves @/* against THIS app.
  optimizeDeps: { exclude: PACKAGE_SPECIFIERS, include: PACKAGE_ONLY_DEPS },
  resolve: {
    // See tsconfig: symlinked sibling checkout.
    preserveSymlinks: true,
    alias: resolveAlias,
  },
  build: {
    rollupOptions: {
      output: {
        // The framework stack changes only on dependency bumps - splitting it
        // out of the app entry lets browsers keep it cached across deploys.
        manualChunks: {
          "vendor-react": [
            "react",
            "react-dom",
            "react-router",
            "@reduxjs/toolkit",
            "react-redux",
            "redux-persist",
          ],
        },
      },
    },
  },
})
