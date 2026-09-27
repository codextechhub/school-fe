/**
 * The Posts tab: the server's post tree drawn top-down along the solid lines,
 * with dotted lines listed on each card when they are switched on.
 */

import { ChevronDown } from "lucide-react";
import type {
  MatrixReport,
  OrganogramNode,
  StaffHolder,
} from "@/redux/services/staff/organogram-types";
import { cn } from "@/lib/utils";
import { nextFocusedNode } from "../lib/org-helpers";
import { ActingBadge, HolderStack } from "./org-primitives";

export interface PositionsCtx {
  expanded: Set<number>;
  fullyExpanded: Set<number>;
  focusedPath: readonly number[];
  toggle: (id: number) => void;
  openPosition: (id: number) => void;
  openUser: (u: StaffHolder) => void;
  highlightId: number | null;
  showMatrix: boolean;
  matrixOut: Map<number, MatrixReport[]>;
  matrixIn: Map<number, MatrixReport[]>;
  actingSet: Set<string>;
}

function SeatNode({ node, ctx }: { node: OrganogramNode; ctx: PositionsCtx }) {
  const kids = node.direct_reports;
  const hasChildren = kids.length > 0;
  const open = ctx.expanded.has(node.id);
  const focusedChild = nextFocusedNode(ctx.focusedPath, node.id);
  const focusedOnly = open && focusedChild !== null && !ctx.fullyExpanded.has(node.id);
  const visibleKids = focusedOnly ? kids.filter((child) => child.id === focusedChild) : kids;
  const out = ctx.matrixOut.get(node.id) ?? [];
  const inc = ctx.matrixIn.get(node.id) ?? [];
  const mxCount = out.length + inc.length;
  const highlighted = ctx.highlightId === node.id;
  const actingFilled =
    node.holders.length > 0 && node.holders.every((u) => ctx.actingSet.has(`${u.id}@${node.id}`));

  return (
    <li data-pid={node.id}>
      <div
        data-card
        className={cn(
          "group flex w-44 flex-col rounded-xl border px-3 py-2.5 shadow-sm transition-all",
          "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md",
          highlighted && "!border-indigo-400 ring-2 ring-indigo-300",
        )}
        style={highlighted ? { animation: "pulseHL 1.4s ease-out" } : undefined}
      >
        {/* Title and code; opens the post's detail. */}
        <button type="button" onClick={() => ctx.openPosition(node.id)} className="w-full flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            {actingFilled && <ActingBadge />}
          </div>
          <span className="block truncate w-full text-[12.5px] font-semibold leading-snug text-slate-800">
            {node.title}
          </span>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-500 shrink-0">{node.code}</span>
          </div>
        </button>

        {/* Holders, and the expand control. */}
        {(node.holders.length > 0 || hasChildren) && (
          <div className="mt-2 flex w-full items-center justify-between gap-2">
            {node.holders.length > 0
              ? <HolderStack users={node.holders} onPick={ctx.openUser} />
              : <span />
            }
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); ctx.toggle(node.id); }}
                aria-expanded={open}
                className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 shrink-0"
              >
                <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
                {kids.length}
              </button>
            )}
          </div>
        )}

        {/* Dotted lines. */}
        {ctx.showMatrix && mxCount > 0 && (
          <div className="mt-2 flex w-full flex-col gap-1">
            {out.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 truncate rounded-lg bg-teal-50/70 px-2 py-1 text-[10.5px] text-teal-800 ring-1 ring-teal-100">
                <span className="inline-block h-0 w-3.5 shrink-0 border-t-2 border-dotted border-teal-500" />
                <span className="truncate">
                  → <span className="font-semibold">{m.reports_to.title}</span>
                  {m.relationship_label && <span className="text-teal-600/70"> · {m.relationship_label}</span>}
                </span>
              </span>
            ))}
            {inc.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 truncate rounded-lg bg-slate-50 px-2 py-1 text-[10.5px] text-slate-600 ring-1 ring-white-02">
                <span className="inline-block h-0 w-3.5 shrink-0 border-t-2 border-dotted border-slate-400" />
                <span className="truncate"><span className="font-semibold">{m.position.title}</span> → here</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {hasChildren && open && (
        <ul>
          {visibleKids.map((k) => (
            <SeatNode key={k.id} node={k} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PositionsTree({ tree, ctx }: { tree: OrganogramNode[]; ctx: PositionsCtx }) {
  return (
    <div className="org-chart inline-flex min-w-full justify-center">
      <ul>
        {tree.map((node) => (
          <SeatNode key={node.id} node={node} ctx={ctx} />
        ))}
      </ul>
    </div>
  );
}
