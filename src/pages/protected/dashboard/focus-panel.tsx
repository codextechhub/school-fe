import { useEffect, useReducer, useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Info,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AttentionItem, AttentionTone } from "./attention";
import { initialPanelState, panelOpenReducer } from "./panel-open-state";

/**
 * The dashboard's live worklist.
 *
 * The panel can be pinned open or minimized. A minimized panel opens while it
 * is hovered so desktop readers can scan it without changing their saved view;
 * the explicit control provides the same access on touch and keyboard devices.
 * Blocking work opens on arrival, while repeated refreshes respect a reader's
 * decision to minimize it.
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
        "group flex min-w-0 items-center gap-3 rounded-2xl border p-3.5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-md focus-visible:-translate-y-1 focus-visible:scale-[1.015] focus-visible:shadow-md",
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
        <span className="block break-words text-[13px] font-semibold text-black-01">
          {item.title}
        </span>
        <span
          title={item.detail}
          className="mt-0.5 text-[11px] leading-4 text-gray-05 text-pretty"
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
  const [panel, dispatchPanel] = useReducer(
    panelOpenReducer,
    undefined,
    initialPanelState,
  );
  const [hoveredOpen, setHoveredOpen] = useState(false);
  const hasBlocking = items.some((item) => item.tone === "blocking");

  useEffect(() => {
    dispatchPanel({ type: "data", hasBlocking });
  }, [hasBlocking]);

  if (items.length === 0) return null;

  const mine = items.filter((item) => item.mine);
  const watch = items.filter((item) => !item.mine);
  const summary = [
    mine.length > 0 ? `${mine.length} to fix` : null,
    watch.length > 0 ? `${watch.length} to watch` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const expanded = panel.expanded || hoveredOpen;

  return (
    <section
      aria-label="Action needed"
      onMouseEnter={() => setHoveredOpen(true)}
      onMouseLeave={() => setHoveredOpen(false)}
      className={cn(
        "min-w-0 rounded-3xl border p-4 transition-[background-color,border-color,box-shadow] duration-300 sm:p-5",
        expanded
          ? "border-white-02 bg-white shadow-[0_10px_30px_rgba(29,43,68,0.05)]"
          : "border-yellow-01/50 bg-[linear-gradient(112deg,rgba(214,168,90,.20),rgba(214,168,90,.08)_62%,rgba(255,255,255,.9))] shadow-[0_8px_24px_rgba(149,108,37,0.08)]",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span className="rounded-full bg-yellow-01/10 px-2.5 py-1 text-[11px] font-semibold text-yellow-01-text">
            {summary}
          </span>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="dashboard-focus-details"
            aria-label={
              panel.expanded
                ? "Minimize Today's focus"
                : "Maximize Today's focus"
            }
            onClick={() => {
              if (panel.expanded) {
                dispatchPanel({ type: "close" });
                setHoveredOpen(false);
                return;
              }
              dispatchPanel({ type: "open" });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white-02 bg-white/85 px-2.5 py-1.5 text-[11px] font-semibold text-gray-06 shadow-sm transition-[border-color,color,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            {panel.expanded ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
            {panel.expanded ? "Minimize" : "Maximize"}
          </button>
        </div>
      </div>

      <div
        id="dashboard-focus-details"
        aria-hidden={!expanded}
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
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
        </div>
      </div>
    </section>
  );
}
