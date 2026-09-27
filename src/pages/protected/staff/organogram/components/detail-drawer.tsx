/**
 * The slide-over that opens from a person card or a post card.
 *
 * Every member of staff reads it, so it carries what the chart carries (name,
 * post, unit, branch, reporting line) and nothing a colleague may not read.
 * Contact details, pay and leave stay on the staff record, which the person
 * panel links to for a viewer who may open it. Appointment history, with its
 * dates, is drawn only for a viewer who may edit staff records.
 */

import { useMemo } from "react";
import {
  Briefcase, Building2, CornerLeftUp, ExternalLink, GitBranch, History,
  MapPin, Network, ShieldCheck, Spline, UserCheck, Users, X,
} from "lucide-react";
import { Link } from "react-router";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import type { MatrixReport, Position, PositionAssignment, StaffHolder } from "@/redux/services/staff/organogram-types";
import { useGetOrgAssignmentsQuery } from "@/redux/services/staff/organogram-api";
import { asArray, fmtDate, KIND_LABEL } from "../lib/org-helpers";
import { ActingBadge, BranchChip, DeptChip, OrgAvatar } from "./org-primitives";

export type DetailTarget =
  | { kind: "person"; user: StaffHolder; positionId: number | null }
  | { kind: "position"; id: number };

export interface DrawerCtx {
  posMap: Map<number, Position>;
  matrixOut: Map<number, MatrixReport[]>;
  matrixIn: Map<number, MatrixReport[]>;
  openUser: (u: StaffHolder, positionId?: number | null) => void;
  openPosition: (id: number) => void;
  /** Whether the viewer may open this person's staff record. */
  canOpenRecord: (u: StaffHolder) => boolean;
  canViewHistory: boolean;
  actingSet: Set<string>;
}

function Field({ icon: Icon, label, mono, children }: { icon?: React.ElementType; label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      {Icon && <span className="mt-0.5 text-slate-400"><Icon className="size-[15px]" /></span>}
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
        <div className={cn("break-words text-[13.5px] text-slate-700", mono && "font-mono")}>{children}</div>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, accent, children }: { icon: React.ElementType; accent?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2 first:mt-0">
      <Icon className={cn("size-[15px]", accent || "text-indigo-500")} />
      <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{children}</h4>
    </div>
  );
}

/** The posts above `seatId`, top of the school first. */
function useChain(seatId: number | null, posMap: Map<number, Position>) {
  return useMemo(() => {
    const out: Position[] = [];
    if (seatId === null) return out;
    let cur = posMap.get(seatId)?.reports_to?.id ?? null;
    const seen = new Set<number>();
    while (cur !== null && !seen.has(cur)) {
      seen.add(cur);
      const p = posMap.get(cur);
      if (!p) break;
      out.push(p);
      cur = p.reports_to?.id ?? null;
    }
    return out.reverse();
  }, [seatId, posMap]);
}

// ── Person ────────────────────────────────────────────────────────────────────

function PersonDetail({ user, positionId, ctx }: { user: StaffHolder; positionId: number | null; ctx: DrawerCtx }) {
  const { data: historyRes } = useGetOrgAssignmentsQuery(
    { staff: user.staff_id, page_size: 50 },
    { skip: !ctx.canViewHistory },
  );
  const history = asArray<PositionAssignment>(historyRes?.data);

  const seat = positionId !== null ? ctx.posMap.get(positionId) ?? null : null;
  const isActing = positionId !== null && ctx.actingSet.has(`${user.id}@${positionId}`);
  const chain = useChain(positionId, ctx.posMap);
  const manager = chain.length ? chain[chain.length - 1] : null;

  return (
    <div>
      <div className="flex items-start gap-4">
        <OrgAvatar user={user} size={60} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">{user.full_name}</h3>
            {isActing && <ActingBadge />}
          </div>
          <p className="text-[13.5px] text-slate-500">
            {isActing && seat ? `Acting ${seat.title}` : seat?.title || user.job_title || "-"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DeptChip name={seat?.org_node?.name} onClick={() => seat && ctx.openPosition(seat.id)} />
            {seat && <BranchChip name={seat.branch?.name} />}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-2">
        <Field icon={Briefcase} label="Post" mono>{seat?.code || "-"}</Field>
        <Field icon={Building2} label="Unit">
          {seat?.org_node ? `${seat.org_node.name} · ${KIND_LABEL[seat.org_node.kind]}` : "-"}
        </Field>
        {user.job_title && seat && user.job_title !== seat.title && (
          <Field icon={UserCheck} label="Job title">{user.job_title}</Field>
        )}
        <Field icon={MapPin} label="Branch">{seat?.branch?.name || "School-wide"}</Field>
      </div>

      <SectionHead icon={GitBranch}>Reporting line</SectionHead>
      {chain.length ? (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-[12.5px]">
          {chain.map((p, i) => {
            const holder = p.current_holders[0];
            const last = i === chain.length - 1;
            return (
              <span key={p.id} className="flex items-center gap-1">
                {holder ? (
                  <button type="button" onClick={() => ctx.openUser(holder, p.id)} className="rounded px-1 py-0.5 text-indigo-600 hover:bg-indigo-50">
                    {holder.full_name} <span className="text-slate-400">· {p.title}</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => ctx.openPosition(p.id)} className="rounded px-1 py-0.5 text-slate-500 hover:bg-slate-100">
                    {p.title} <span className="text-slate-400">· vacant</span>
                  </button>
                )}
                {!last && <CornerLeftUp className="size-3 rotate-90 text-slate-300" />}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-[13px] text-slate-400">Top of the reporting line.</p>
      )}
      {manager?.current_holders[0] && (
        <div className="mt-2 text-[12px] text-slate-500">
          Reports to{" "}
          <button type="button" onClick={() => ctx.openUser(manager.current_holders[0], manager.id)} className="font-medium text-indigo-600 hover:underline">
            {manager.current_holders[0].full_name}
          </button>
        </div>
      )}

      {ctx.canViewHistory && (
        <>
          <SectionHead icon={History}>Post history</SectionHead>
          <div className="flex flex-col gap-2">
            {history.length ? history.map((a) => {
              const current = a.end_date === null;
              return (
                <div key={a.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2", current ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-white")}>
                  <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", current ? "bg-indigo-500" : "bg-slate-300")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-slate-700">{a.position.title}</span>
                      {a.is_acting && <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700">ACTING</span>}
                      {a.is_primary && <span className="rounded bg-slate-100 px-1 text-[9px] font-bold text-slate-500">PRIMARY</span>}
                    </div>
                    <div className="text-[11.5px] text-slate-400">{fmtDate(a.start_date)} to {current ? "present" : fmtDate(a.end_date)}</div>
                  </div>
                </div>
              );
            }) : <p className="text-[13px] text-slate-400">No appointments on record.</p>}
          </div>
        </>
      )}

      {ctx.canOpenRecord(user) && (
        <Link
          to={routesPath.PROTECTED.STAFF.PROFILE_ID(user.staff_id)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-white-02 px-3 py-1.5 text-[12.5px] font-medium text-primary hover:bg-white-03"
        >
          <ExternalLink className="size-3.5" />
          Open staff profile
        </Link>
      )}
    </div>
  );
}

// ── Post ──────────────────────────────────────────────────────────────────────

function PositionDetail({ id, ctx }: { id: number; ctx: DrawerCtx }) {
  const pos = ctx.posMap.get(id);
  const out = ctx.matrixOut.get(id) ?? [];
  const inc = ctx.matrixIn.get(id) ?? [];
  const kids = useMemo(
    () => Array.from(ctx.posMap.values()).filter((p) => p.reports_to?.id === id),
    [ctx.posMap, id],
  );

  if (!pos) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-[13px] text-slate-500">This post is no longer on the chart.</div>;
  }

  const parent = pos.reports_to ? ctx.posMap.get(pos.reports_to.id) : null;

  return (
    <div>
      <div className="flex items-start gap-4">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <Briefcase className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-800">{pos.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">{pos.code}</span>
            <DeptChip name={pos.org_node?.name} />
            <BranchChip name={pos.branch?.name} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-2">
        <Field icon={ShieldCheck} label="Status">{pos.is_active ? "Active" : "Inactive"}</Field>
        <Field icon={CornerLeftUp} label="Reports to">
          {parent ? (
            <button type="button" onClick={() => ctx.openPosition(parent.id)} className="text-indigo-600 hover:underline">{parent.title}</button>
          ) : (
            <span className="text-slate-400">Top of the school</span>
          )}
        </Field>
        <Field icon={Building2} label="Unit">{pos.org_node ? `${pos.org_node.name} · ${KIND_LABEL[pos.org_node.kind]}` : "-"}</Field>
      </div>

      <SectionHead icon={UserCheck}>Held by</SectionHead>
      {pos.current_holders.length ? (
        <div className="flex flex-col gap-1">
          {pos.current_holders.map((u) => (
            <button type="button" key={u.id} onClick={() => ctx.openUser(u, pos.id)} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-50">
              <OrgAvatar user={u} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-slate-700">{u.full_name}</div>
                {u.job_title && <div className="truncate text-[11.5px] text-slate-400">{u.job_title}</div>}
              </div>
              {ctx.actingSet.has(`${u.id}@${id}`) && <ActingBadge />}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-slate-400">Vacant.</p>
      )}

      {(out.length > 0 || inc.length > 0) && (
        <>
          <SectionHead icon={Spline} accent="text-teal-600">Dotted lines</SectionHead>
          <div className="flex flex-col gap-2">
            {out.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg bg-teal-50/60 px-2.5 py-2 text-[12.5px] text-teal-800 ring-1 ring-teal-100">
                <span className="inline-block h-0 w-5 shrink-0 border-t-2 border-dotted border-teal-500" />
                <span>Also reports to <button type="button" onClick={() => ctx.openPosition(m.reports_to.id)} className="font-semibold hover:underline">{m.reports_to.title}</button>{m.relationship_label && <span className="text-teal-600"> ({m.relationship_label})</span>}</span>
              </div>
            ))}
            {inc.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[12.5px] text-slate-600 ring-1 ring-white-02">
                <span className="inline-block h-0 w-5 shrink-0 border-t-2 border-dotted border-slate-400" />
                <span><button type="button" onClick={() => ctx.openPosition(m.position.id)} className="font-semibold hover:underline">{m.position.title}</button> also reports here</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHead icon={Network}>Posts reporting here <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">{kids.length}</span></SectionHead>
      {kids.length ? (
        <div className="flex flex-col gap-1">
          {kids.map((k) => (
            <button type="button" key={k.id} onClick={() => ctx.openPosition(k.id)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
              <div className="flex min-w-0 items-center gap-2">
                <Briefcase className="size-3.5 shrink-0 text-slate-400" />
                <span className="truncate text-[13px] font-medium text-slate-700">{k.title}</span>
              </div>
              {k.is_vacant && <span className="shrink-0 text-[11px] text-slate-400">Vacant</span>}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-slate-400">No posts report here.</p>
      )}
    </div>
  );
}

export function DetailDrawer({ target, onClose, ctx }: { target: DetailTarget | null; onClose: () => void; ctx: DrawerCtx }) {
  const isPosition = target?.kind === "position";
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[440px]" showCloseButton={false}>
        <SheetTitle className="sr-only">{isPosition ? "Post detail" : "Person detail"}</SheetTitle>
        <SheetDescription className="sr-only">Organogram detail panel</SheetDescription>
        <div className="flex items-center justify-between border-b border-white-02 px-5 py-3.5">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
            {isPosition ? <Briefcase className="size-3.5" /> : <Users className="size-3.5" />}
            {isPosition ? "Post" : "Person"}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-4.5" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-5 py-5">
            {target?.kind === "person" && <PersonDetail user={target.user} positionId={target.positionId} ctx={ctx} />}
            {target?.kind === "position" && <PositionDetail id={target.id} ctx={ctx} />}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
