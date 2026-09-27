/**
 * Does every walkthrough step point at something that exists?
 *
 * A step names its element by `data-guide`, and a name nothing carries shows
 * the reader "This step is unavailable" on a screen that looks fine. So every
 * target is looked for in this app's source and in the shared package's, as a
 * literal `data-guide="..."` or, for the settings layout, as the prefix it
 * builds `.heading`, `.sections` and `.content` from.
 */

// Node types for this file alone: an audit that reads the source tree.
/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { WALKTHROUGH_REGISTRY } from "./registry";
import type { Walkthrough } from "./types";

function sourceOf(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceOf(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(readFileSync(full, "utf8"));
  }
  return out;
}

const corpus = [
  ...sourceOf("src"),
  ...sourceOf("node_modules/@xvs/finance/src"),
].join("\n");

const LAYOUT_SUFFIXES = [".heading", ".sections", ".content"];

function targetExists(target: string): boolean {
  if (corpus.includes(`data-guide="${target}"`)) return true;
  const suffix = LAYOUT_SUFFIXES.find((candidate) => target.endsWith(candidate));
  return !!suffix && corpus.includes(`guideTargetPrefix="${target.slice(0, -suffix.length)}"`);
}

describe("walkthrough targets", () => {
  it("are all carried by an element somewhere in the source", () => {
    const missing = (WALKTHROUGH_REGISTRY as readonly Walkthrough[]).flatMap((walkthrough) => (
      walkthrough.steps
        .filter((step) => step.target && !targetExists(step.target))
        .map((step) => `${walkthrough.id}:${step.id} -> ${step.target}`)
    ));
    expect(missing).toEqual([]);
  });
});
