#!/usr/bin/env node
/**
 * Stops `npm run dev` and `npm test` early when the installed shared finance
 * package is not the one this app pins, and says how to fix it.
 *
 * `@xvs/finance` is a git dependency whose own version never changes between
 * tags, so after the pin moves (package.json and package-lock.json name a new
 * tag) a plain `npm install` keeps the old copy: npm compares versions, and
 * they match. The app then fails inside Vite with an unhelpful "Failed to
 * resolve import" for whatever the new tag added. npm records the commit it
 * actually installed in node_modules/.package-lock.json, so comparing that with
 * the lockfile tells the two apart.
 *
 * It also refuses two other states that break the app in the same quiet way:
 * - the package linked to a FinPro checkout instead of installed as a real
 *   copy (school-fe/CLAUDE.md: this app holds a real copy, and a link lets a
 *   "reset" of this copy overwrite FinPro's working tree);
 * - native build tools installed for a different processor than the Node
 *   running now (an install under an Intel Node on an Apple silicon Mac),
 *   which stops Vite and Vitest from starting.
 *
 * Set SKIP_FINANCE_CHECK=1 to run anyway, for example while previewing an
 * unreleased FinPro copied into node_modules on purpose.
 *
 * Exit code 0 when all is well, 1 with a plain explanation otherwise.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PACKAGE = "@xvs/finance";
const KEY = `node_modules/${PACKAGE}`;

/** The commit a lockfile entry's `resolved` URL names, or null. */
function commitOf(entry) {
  const resolved = entry?.resolved ?? "";
  const hash = resolved.split("#")[1] ?? "";
  return /^[0-9a-f]{7,40}$/.test(hash) ? hash : null;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * The problems with this checkout's installed finance package, as sentences.
 * Empty when there are none.
 */
export function financeInstallProblems(root) {
  const problems = [];
  const reinstall = `rm -rf node_modules/${PACKAGE} && npm install`;

  const lock = readJson(path.join(root, "package-lock.json"));
  const pinned = commitOf(lock?.packages?.[KEY]);
  if (!pinned) return problems;

  const installedDir = path.join(root, KEY);
  let stat = null;
  try {
    stat = fs.lstatSync(installedDir);
  } catch {
    problems.push(`${PACKAGE} is not installed. Run: npm install`);
    return problems;
  }
  if (stat.isSymbolicLink()) {
    problems.push(
      `${KEY} is a link to ${fs.readlinkSync(installedDir)}, not a real copy. ` +
        `This app must hold the pinned copy. Run: ${reinstall}`,
    );
    return problems;
  }

  const hidden = readJson(path.join(root, "node_modules", ".package-lock.json"));
  const installed = commitOf(hidden?.packages?.[KEY]);
  if (installed && installed !== pinned) {
    const tag = (readJson(path.join(root, "package.json"))?.dependencies?.[PACKAGE] ?? "").split("#")[1];
    problems.push(
      `${PACKAGE} installed here is commit ${installed.slice(0, 7)}, but this app pins ` +
        `${tag ? `${tag} (` : ""}${pinned.slice(0, 7)}${tag ? ")" : ""}. ` +
        `npm keeps the old copy because the package's version number never changes. Run: ${reinstall}`,
    );
  }

  const wanted = `${process.platform}-${process.arch}`;
  const esbuild = path.join(root, "node_modules", "@esbuild");
  if (fs.existsSync(esbuild)) {
    const builds = fs.readdirSync(esbuild);
    if (builds.length > 0 && !builds.includes(wanted)) {
      problems.push(
        `The installed build tools are for ${builds.join(", ")}, but this Node runs on ${wanted}. ` +
          `They were installed with a different Node (check \`node -p process.arch\`). ` +
          `Reinstall with this Node: rm -rf node_modules && npm install`,
      );
    }
  }

  return problems;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  if (process.env.SKIP_FINANCE_CHECK === "1") process.exit(0);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const problems = financeInstallProblems(root);
  if (problems.length > 0) {
    console.error("\nThe installed packages do not match this app:\n");
    for (const problem of problems) console.error(`  - ${problem}\n`);
    console.error("Set SKIP_FINANCE_CHECK=1 to start anyway.\n");
    process.exit(1);
  }
}
