import { Link } from "react-router";
import { AlertTriangle, ArrowUpRight, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AttentionItem, AttentionTone } from "./attention";

/**
 * The dashboard's live worklist.
 *
 * Important rows stay visible. Hiding them behind a collapsed panel made the
 * dashboard look calm while approvals, unplaced students, or timetable
 * clashes were waiting underneath it. The two groups distinguish work from
 * information, but neither needs a hover or a second click to be read.
 *
 * Nothing is dismissible. Each row is recomputed from live server state and
 * disappears only when the underlying condition is resolved.
 */

const TONES: Record<
  AttentionTone,
  { card: string; tile: string; stat: string; icon: typeof Info }
> = {
  blocking: {
    card: "border-error-text/25 bg-error-text/5 hover:border-error-text/45",
    tile: "bg-error-text/10 text-error-text",
    stat: "text-error-text",
    icon: AlertTriangle,
  },
  warning: {
    card: "border-yellow-01/35 bg-yellow-01/5 hover:border-yellow-02/60",
    tile: "bg-yellow-01/15 text-yellow-01-text",
    stat: "text-yellow-01-text",
    icon: AlertTriangle,
  },
  info: {
    card: "border-white-02 bg-white-05 hover:border-primary/30",
    tile: "bg-pry-01 text-primary",
    stat: "text-primary",
    icon: Info,
  },
};

function GroupHeading({
  title,
  note,
  tone,
}: {
  title: string;
  note: string;
  tone: "mine" | "watch";
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <h3
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.15em]",
          tone === "mine" ? "text-primary" : "text-gray-05",
        )}
      >
        {title}
      </h3>
      <p className="text-[11px] text-gray-05">{note}</p>
    </div>
  );
}

/** One condition. The link fills the card, so the whole card is the target. */
function FocusCard({ item }: { item: AttentionItem }) {
  const tone = TONES[item.tone];
  const Icon = tone.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-2xl border p-3.5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm",
        tone.card,
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          tone.tile,
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-black-01">
          {item.title}
        </span>
        <span
          title={item.detail}
          className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-gray-05 text-pretty"
        >
          {item.detail}
        </span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
          {item.action}
          <ArrowUpRight className="size-3" />
        </span>
      </span>
      {item.stat !== undefined && (
        <span
          className={cn(
            "shrink-0 self-start font-mont text-sm font-semibold tabular-nums",
            tone.stat,
          )}
        >
          {item.stat}
        </span>
      )}
    </Link>
  );
}

export function FocusPanel({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  const mine = items.filter((item) => item.mine);
  const watch = items.filter((item) => !item.mine);
  const summary = [
    mine.length > 0 ? `${mine.length} to fix` : null,
    watch.length > 0 ? `${watch.length} to watch` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-label="Action needed"
      className="min-w-0 rounded-3xl border border-white-02 bg-white p-4 shadow-[0_10px_30px_rgba(29,43,68,0.05)] sm:p-5"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-yellow-02">
            Today&apos;s focus
          </p>
          <h2 className="mt-1 font-mont text-lg font-semibold tracking-tight text-black-01">
            What needs your attention
          </h2>
          <p className="mt-0.5 text-xs text-gray-05">
            The live worklist for this school.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-yellow-01/10 px-2.5 py-1 text-[11px] font-semibold text-yellow-01-text">
          {summary}
        </span>
      </div>

      {mine.length > 0 && (
        <section aria-label="Yours to fix" className="mt-5">
          <GroupHeading
            title="Yours to fix"
            note="Work that is waiting on the school"
            tone="mine"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {mine.map((item) => (
              <FocusCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {watch.length > 0 && (
        <section
          aria-label="Watch"
          className={mine.length > 0 ? "mt-5" : "mt-4"}
        >
          <GroupHeading
            title="Good to know"
            note="Worth checking, and possibly deliberate"
            tone="watch"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {watch.map((item) => (
              <FocusCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
