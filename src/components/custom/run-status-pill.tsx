/**
 * One status pill for asynchronous work, shared by the two surfaces that show
 * it: Export → View Queues (core.BackgroundJob, the *worker's* view) and the
 * Export Centre's Files and run detail (vs_exports.ExportRun, the *outcome's*
 * view). The reconciliation it enforces is written up in
 * docs/EXPORT_BUILD_NOTES.md; the short version:
 *
 *   • A run wraps a job (ExportRun.background_job), so the same export exists on
 *     both surfaces. Two words for one outcome is the confusion this feature
 *     exists to remove - so the job vocabulary's SUCCEEDED is displayed with the
 *     run vocabulary's word, "Completed". The wire tokens are untouched.
 *   • Every status carries a leading glyph as well as a colour, without
 *     exception, so it survives greyscale, colour-blindness and a photocopier.
 *   • Colour comes from StatusPill's VARIANT_BY_STATUS. This is not a parallel
 *     status system - it is that map plus a glyph.
 *
 * Deliberately NOT here: schedule states (Active / Paused). They arrive with
 * schedules themselves, and an unused branch is a claim the product cannot yet
 * honour.
 */

import { Badge } from "@/components/ui/badge";
import { statusLabel, statusVariant } from "@/components/finance-ui/status-pill";
import { cn } from "@/lib/utils";

// Every status either surface can show. `SUCCEEDED` is the job vocabulary's
// spelling of `COMPLETED` and is listed only so it can be translated away.
export type RunStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "COMPLETED_WITH_OMISSIONS"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "SUCCEEDED";

// The one word for each outcome, across both surfaces.
const WORD: Record<string, string> = {
  SUCCEEDED: "Completed", // job vocabulary → run vocabulary
};

// Leading glyph per status, so colour is never the only carrier.
const GLYPH: Record<string, string> = {
  QUEUED: "◔",
  RUNNING: "", // rendered as the pinging dot below
  COMPLETED: "✓",
  SUCCEEDED: "✓",
  COMPLETED_WITH_OMISSIONS: "!",
  FAILED: "✕",
  CANCELLED: "⊗",
  EXPIRED: "⊘",
};

// The word a person reads for one run or job status.
export function runStatusWord(status: string): string {
  const token = status.toUpperCase();
  return WORD[token] ?? statusLabel(token);
}

export function RunStatusPill({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return <span className="text-gray-05">-</span>;
  const token = status.toUpperCase();

  // Running keeps --primary and the pinging dot: the one status the Queues page
  // already renders this way, and at 5.05:1 on primary/10 the only raw brand hue
  // that passes AA as small text unmodified.
  if (token === "RUNNING") {
    return (
      <Badge className={cn("gap-1.5 bg-primary/10 font-mont text-primary", className)}>
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        Running
      </Badge>
    );
  }

  return (
    <Badge variant={statusVariant(token)} className={cn("gap-1.5 font-mont", className)}>
      {GLYPH[token] ? (
        <span aria-hidden="true" className="font-geist-mono text-[10px] font-semibold">
          {GLYPH[token]}
        </span>
      ) : null}
      {runStatusWord(token)}
    </Badge>
  );
}
