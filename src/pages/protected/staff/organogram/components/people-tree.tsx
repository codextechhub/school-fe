/**
 * The People tab: a top-down chart with one card per person.
 *
 * Connector lines come from the `.org-chart` rules in `index.css`. The cards
 * are derived from the post tree, so a person holding two posts appears twice,
 * once under each manager.
 */

import { ChevronDown } from "lucide-react";
import type { StaffHolder } from "@/redux/services/staff/organogram-types";
import { cn } from "@/lib/utils";
import { countAllReports, nextFocusedNode, type PeopleNode } from "../lib/org-helpers";
import { ActingBadge, OrgAvatar } from "./org-primitives";

export interface PeopleCtx {
  expanded: Set<string>;
  fullyExpanded: Set<string>;
  focusedPath: readonly string[];
  toggle: (id: string) => void;
  openUser: (u: StaffHolder) => void;
  highlightId: string | null;
}

function PersonNode({ node, ctx }: { node: Extract<PeopleNode, { kind: "person" }>; ctx: PeopleCtx }) {
  const jobTitle = node.positionTitle || node.user.job_title;
  const directReports = node.children.length;
  const totalReports = countAllReports(node.children);
  const hasChildren = node.children.length > 0;
  const open = ctx.expanded.has(node.user.id);
  const focusedChild = nextFocusedNode(ctx.focusedPath, node.user.id);
  const focusedOnly = open && focusedChild !== null && !ctx.fullyExpanded.has(node.user.id);
  const visibleChildren = focusedOnly
    ? node.children.filter((child) => child.user.id === focusedChild)
    : node.children;
  const highlighted = ctx.highlightId === node.user.id;

  return (
    <li data-uid={node.user.id}>
      <div
        data-card
        className={cn(
          "group flex w-52 flex-col items-center rounded-2xl border bg-white px-3 pb-2.5 pt-4 shadow-sm transition-all",
          highlighted
            ? "border-indigo-400 ring-2 ring-indigo-300"
            : "border-slate-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md",
        )}
        style={highlighted ? { animation: "pulseHL 1.4s ease-out" } : undefined}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => ctx.openUser(node.user)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              ctx.openUser(node.user);
            }
          }}
          className="flex w-full cursor-pointer flex-col items-center text-center"
        >
          <OrgAvatar user={node.user} size={44} />
          <div className="mt-2 flex max-w-full items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold text-slate-800">{node.user.full_name}</span>
            {node.isActing && <ActingBadge />}
          </div>
          <span className="max-w-full truncate text-[12px] text-slate-500">
            {node.isActing ? `Acting ${node.positionTitle}` : jobTitle}
          </span>
        </div>

        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ctx.toggle(node.user.id);
            }}
            aria-expanded={open}
            className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
          >
            <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
            {directReports} | {totalReports}
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul>
          {visibleChildren.map((c) => (
            // Person and post: one person can hold two posts among siblings.
            <PersonNode key={`${c.user.id}-${c.positionId}`} node={c} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PeopleTree({ roots, ctx }: { roots: PeopleNode[]; ctx: PeopleCtx }) {
  return (
    <div className="org-chart inline-flex min-w-full justify-center">
      <ul>
        {roots.map((node) => (
          <PersonNode key={`${node.user.id}-${node.positionId}`} node={node} ctx={ctx} />
        ))}
      </ul>
    </div>
  );
}
