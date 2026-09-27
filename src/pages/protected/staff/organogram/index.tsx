/**
 * The organogram: who reports to whom across the school.
 *
 * Every member of staff reads the whole school's chart, every branch included,
 * because knowing who your manager's manager is does not depend on where you
 * are based. What they read is names, posts, units and lines; contact details,
 * pay and leave stay on the staff record.
 *
 * Two views of one tree, both of the school as it is staffed. **People** draws
 * one card per holder; **Posts** draws one card per post, with its holders as
 * faces, and can show dotted lines. Neither draws a vacant post: its reports
 * are lifted to the nearest filled post above, so a vacant Head of Primary
 * never hides the primary teachers. Vacancies and headcount are Manage's.
 *
 * The chart opens on the viewer's own reporting line, with every other branch
 * of the tree closed, and "Collapse all" returns there rather than to the top
 * of the school. A viewer who holds no post sees the top two levels instead.
 *
 * The summary strip (headcount, acting, on leave, suspended) and a person's
 * post history are drawn for a reader who may edit staff records
 * (`school.teachers.update`), because leave and suspension counts and tenure
 * dates are an administrator's business. The directory key will not do: every
 * teacher holds it. The server refuses both to anyone else.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Ban, Briefcase, Building2, ChevronsDownUp, Filter, Info, Maximize,
  Minus, PlaneTakeoff, Plus, RefreshCw, Search, Settings2, Sparkles, Users, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageShell } from "@/components/layout/page-shell";
import { SearchSelect } from "@/components/custom/search-select";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { routesPath } from "@/routes/routesPath";
import { useAppSelector } from "@/redux/store";
import { selectUser } from "@/redux/features/auth/auth-slice";
import type {
  CurrentOrganogramAssignment, MatrixReport, OrgNode, OrganogramNode, Position, StaffHolder,
} from "@/redux/services/staff/organogram-types";
import {
  useGetCurrentOrgAssignmentsQuery, useGetOrgMatrixReportsQuery, useGetOrgNodesQuery,
  useGetOrgPositionsQuery, useGetOrgPositionTreeQuery, useGetOrgSummaryQuery,
} from "@/redux/services/staff/organogram-api";
import {
  asArray, buildActingSet, buildOrgNodeMap, buildPeopleTree, collectPeopleIds,
  collectPositionIds, findPeoplePathToUser, findPositionPathToUser,
  orgNodeDescendantIds, pruneTreeByOrgNodes, pruneVacantPositions,
} from "./lib/org-helpers";
import { OrgAvatar } from "./components/org-primitives";
import { PositionsTree, type PositionsCtx } from "./components/positions-tree";
import { PeopleTree, type PeopleCtx } from "./components/people-tree";
import { DetailDrawer, type DetailTarget } from "./components/detail-drawer";

const LARGE = { page_size: 100 } as const;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number | string; accent: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent)}><Icon className="size-[15px]" /></span>
      <div className="leading-tight">
        <div className="text-[15px] font-bold text-slate-800">{value}</div>
        <div className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export default function OrganogramPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const canViewSummary = hasPermission(P.MODIFY_TEACHER);
  const canManage = hasAnyPermission(
    P.CREATE_ORG_STRUCTURE, P.UPDATE_ORG_STRUCTURE, P.DELETE_ORG_STRUCTURE, P.APPOINT_TO_POST,
  );

  const { data: treeRes, isLoading: treeLoading, isError: treeError, refetch: refetchTree } = useGetOrgPositionTreeQuery();
  const { data: positionsRes } = useGetOrgPositionsQuery(LARGE);
  const { data: orgNodesRes } = useGetOrgNodesQuery(LARGE);
  const { data: assignmentsRes } = useGetCurrentOrgAssignmentsQuery();
  const { data: matrixRes } = useGetOrgMatrixReportsQuery(LARGE);
  const { data: summaryRes } = useGetOrgSummaryQuery(undefined, { skip: !canViewSummary });

  const tree = useMemo(() => asArray<OrganogramNode>(treeRes?.data), [treeRes]);
  const positions = useMemo(() => asArray<Position>(positionsRes?.data), [positionsRes]);
  const orgNodes = useMemo(() => asArray<OrgNode>(orgNodesRes?.data), [orgNodesRes]);
  const assignments = useMemo(() => asArray<CurrentOrganogramAssignment>(assignmentsRes?.data), [assignmentsRes]);
  const matrix = useMemo(() => asArray<MatrixReport>(matrixRes?.data), [matrixRes]);
  const summary = summaryRes?.data;

  const posMap = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);
  const orgNodeMap = useMemo(() => buildOrgNodeMap(orgNodes), [orgNodes]);
  const actingSet = useMemo(() => buildActingSet(assignments), [assignments]);
  const matrixOut = useMemo(() => {
    const m = new Map<number, MatrixReport[]>();
    for (const r of matrix) { const a = m.get(r.position.id) ?? []; a.push(r); m.set(r.position.id, a); }
    return m;
  }, [matrix]);
  const matrixIn = useMemo(() => {
    const m = new Map<number, MatrixReport[]>();
    for (const r of matrix) { const a = m.get(r.reports_to.id) ?? []; a.push(r); m.set(r.reports_to.id, a); }
    return m;
  }, [matrix]);

  const nodeOptions = useMemo(() => {
    const rank = { DIVISION: 0, DEPARTMENT: 1, TEAM: 2 } as const;
    return [...orgNodes]
      .sort((a, b) => rank[a.kind] - rank[b.kind] || a.name.localeCompare(b.name))
      .map((n) => ({ value: String(n.id), label: n.branch ? `${n.name} · ${n.branch.name}` : n.name }));
  }, [orgNodes]);

  const [tab, setTab] = useState<"people" | "positions">("people");
  const [deptFilter, setDeptFilter] = useState<number | "ALL">("ALL");
  const [showMatrix, setShowMatrix] = useState(false);
  const [target, setTarget] = useState<DetailTarget | null>(null);
  const [highlightUid, setHighlightUid] = useState<string | null>(null);
  const [highlightPid, setHighlightPid] = useState<number | null>(null);
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set());
  const [expandedPos, setExpandedPos] = useState<Set<number>>(new Set());
  const [fullyExpandedPeople, setFullyExpandedPeople] = useState<Set<string>>(new Set());
  const [fullyExpandedPos, setFullyExpandedPos] = useState<Set<number>>(new Set());
  const [focusedPeoplePath, setFocusedPeoplePath] = useState<string[]>([]);
  const [focusedPosPath, setFocusedPosPath] = useState<number[]>([]);
  const [initialised, setInitialised] = useState(false);
  const [pendingScrollUid, setPendingScrollUid] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const me = useAppSelector(selectUser);

  // ── Zoom and pan ────────────────────────────────────────────────────────────
  // Zoom is written to the DOM on every wheel event, with the point under the
  // cursor held still; React state mirrors it once a frame for the readout.
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const zoomWrapRef = useRef<HTMLDivElement | null>(null);
  const zoomSyncRaf = useRef(0);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const applyZoom = (next: number, anchor?: { ox: number; oy: number }) => {
    const cont = scrollRef.current;
    const wrap = zoomWrapRef.current;
    if (!cont || !wrap) return;
    const z1 = zoomRef.current;
    const z2 = clampZoom(next);
    if (z2 === z1) return;
    const sl = cont.scrollLeft;
    const st = cont.scrollTop;
    const ox = anchor?.ox ?? cont.clientWidth / 2;
    const oy = anchor?.oy ?? cont.clientHeight / 2;
    zoomRef.current = z2;
    wrap.style.zoom = String(z2);
    cont.scrollLeft = ((sl + ox) / z1) * z2 - ox;
    cont.scrollTop = ((st + oy) / z1) * z2 - oy;
    if (!zoomSyncRaf.current) {
      zoomSyncRaf.current = requestAnimationFrame(() => {
        zoomSyncRaf.current = 0;
        setZoom(zoomRef.current);
      });
    }
  };

  // Ctrl or Cmd with the wheel, and a trackpad pinch, zoom at the cursor. A
  // native listener, because React's wheel handler is passive and cannot stop
  // the browser zooming the whole page.
  useEffect(() => {
    const cont = scrollRef.current;
    if (!cont) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const deltaPx = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.exp(-deltaPx * 0.0022);
      const rect = cont.getBoundingClientRect();
      applyZoom(zoomRef.current * factor, { ox: e.clientX - rect.left, oy: e.clientY - rect.top });
    };
    cont.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cont.removeEventListener("wheel", onWheel);
      if (zoomSyncRaf.current) cancelAnimationFrame(zoomSyncRaf.current);
    };
    // applyZoom reads refs only; the listener mounts once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag the background to pan with a mouse; touch keeps its own native scroll.
  const onPanStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    if ((e.target as HTMLElement).closest("[data-card], button, a, [data-slot=scroll-area-scrollbar]")) return;
    const cont = scrollRef.current;
    if (!cont) return;
    panRef.current = { x: e.clientX, y: e.clientY, sl: cont.scrollLeft, st: cont.scrollTop };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanning(true);
  };
  const onPanMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = panRef.current;
    const cont = scrollRef.current;
    if (!start || !cont) return;
    cont.scrollLeft = start.sl - (e.clientX - start.x);
    cont.scrollTop = start.st - (e.clientY - start.y);
  };
  const onPanEnd = () => {
    panRef.current = null;
    setPanning(false);
  };

  // Narrowed to the chosen unit and the units under it.
  const viewTree = useMemo(() => {
    const staffed = pruneVacantPositions(tree);
    if (deptFilter === "ALL") return staffed;
    return pruneTreeByOrgNodes(staffed, orgNodeDescendantIds(orgNodeMap, deptFilter));
  }, [tree, orgNodeMap, deptFilter]);

  const peopleRoots = useMemo(() => buildPeopleTree(viewTree, actingSet), [viewTree, actingSet]);

  const matchMe = (u: StaffHolder) => !!me && String(u.id) === String(me.id);

  /** The chart's home: the viewer's own line, or the top two levels. */
  const focusOnMyLine = () => {
    const myPeoplePath = me ? findPeoplePathToUser(peopleRoots, matchMe) : null;
    setFullyExpandedPeople(new Set());
    setFullyExpandedPos(new Set());
    if (myPeoplePath?.length) {
      const myPositionPath = findPositionPathToUser(viewTree, matchMe) ?? [];
      setFocusedPeoplePath(myPeoplePath);
      setFocusedPosPath(myPositionPath);
      setExpandedPeople(new Set(myPeoplePath.slice(0, -1)));
      setExpandedPos(new Set(myPositionPath.slice(0, -1)));
      const myUid = myPeoplePath[myPeoplePath.length - 1];
      setHighlightUid(myUid);
      setPendingScrollUid(myUid);
      return;
    }
    const pos = new Set<number>();
    const ppl = new Set<string>();
    for (const root of viewTree) {
      pos.add(root.id);
      root.direct_reports.forEach((c) => pos.add(c.id));
      root.holders.forEach((u) => ppl.add(u.id));
      root.direct_reports.forEach((c) => c.holders.forEach((u) => ppl.add(u.id)));
    }
    setFocusedPeoplePath([]);
    setFocusedPosPath([]);
    setExpandedPos(pos);
    setExpandedPeople(ppl);
  };

  if (!initialised && tree.length) {
    focusOnMyLine();
    setInitialised(true);
  }

  const openUser = (u: StaffHolder, positionId: number | null = null) => {
    const seat = positionId ?? assignments.find((a) => a.staff.id === u.id)?.position.id ?? null;
    setTarget({ kind: "person", user: u, positionId: seat });
  };
  const openPosition = (id: number) => setTarget({ kind: "position", id });

  // Opening a branch re-centres on the card at the current zoom.
  const togglePos = (id: number) => {
    if (expandedPos.has(id) && focusedPosPath.includes(id) && !fullyExpandedPos.has(id)) {
      setFullyExpandedPos((current) => new Set(current).add(id));
      scrollToNode(`[data-pid="${id}"]`);
      return;
    }
    setExpandedPos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    scrollToNode(`[data-pid="${id}"]`);
  };
  const togglePeople = (id: string) => {
    if (expandedPeople.has(id) && focusedPeoplePath.includes(id) && !fullyExpandedPeople.has(id)) {
      setFullyExpandedPeople((current) => new Set(current).add(id));
      scrollToNode(`[data-uid="${id}"]`);
      return;
    }
    setExpandedPeople((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    scrollToNode(`[data-uid="${id}"]`);
  };

  const expandAll = () => {
    if (tab === "positions") {
      const ids = collectPositionIds(viewTree);
      setExpandedPos(new Set(ids));
      setFullyExpandedPos(new Set(ids));
    } else {
      const ids = collectPeopleIds(peopleRoots);
      setExpandedPeople(new Set(ids));
      setFullyExpandedPeople(new Set(ids));
    }
  };
  const collapseAll = focusOnMyLine;

  /**
   * Centre a card in the stage by scrolling the stage alone.
   *
   * `scrollIntoView` scrolls every scrolling ancestor, the window included, so
   * on a phone it pushed the page header off the top to reach a card.
   */
  const centerInStage = (el: HTMLElement | null) => {
    const cont = scrollRef.current;
    if (!cont || !el) return;
    const box = cont.getBoundingClientRect();
    const card = el.getBoundingClientRect();
    cont.scrollBy({
      left: card.left + card.width / 2 - (box.left + box.width / 2),
      top: card.top + card.height / 2 - (box.top + box.height / 2),
      behavior: "smooth",
    });
  };

  const scrollToNode = (selector: string) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(selector) as HTMLElement | null;
      centerInStage(el);
    });
  };

  // Scroll once to the viewer, then let the highlight fade.
  useEffect(() => {
    if (!pendingScrollUid) return;
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(`[data-uid="${pendingScrollUid}"]`) as HTMLElement | null;
      centerInStage(el);
    });
    const timer = setTimeout(() => {
      setHighlightUid((h) => (h === pendingScrollUid ? null : h));
      setPendingScrollUid(null);
    }, 1600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [pendingScrollUid]);

  const jumpToUser = (u: StaffHolder) => {
    setDeptFilter("ALL");
    setTab("people");
    const ids = collectPeopleIds(buildPeopleTree(pruneVacantPositions(tree), actingSet));
    setFocusedPeoplePath([]);
    setExpandedPeople(new Set(ids));
    setFullyExpandedPeople(new Set(ids));
    setHighlightUid(u.id);
    setTimeout(() => setHighlightUid((h) => (h === u.id ? null : h)), 1600);
    setTimeout(() => scrollToNode(`[data-uid="${u.id}"]`), 90);
  };
  const jumpToPosition = (id: number) => {
    setDeptFilter("ALL");
    setTab("positions");
    const ids = collectPositionIds(tree);
    setFocusedPosPath([]);
    setExpandedPos(new Set(ids));
    setFullyExpandedPos(new Set(ids));
    setHighlightPid(id);
    setTimeout(() => setHighlightPid((h) => (h === id ? null : h)), 1600);
    setTimeout(() => scrollToNode(`[data-pid="${id}"]`), 90);
  };

  const canBrowseStaff = hasPermission(P.BROWSE_TEACHERS);
  const drawerCtx = {
    posMap,
    matrixOut,
    matrixIn,
    openUser,
    openPosition,
    // A reader always reaches their own record; anyone else's needs the directory key.
    canOpenRecord: (u: StaffHolder) => canBrowseStaff || matchMe(u),
    canViewHistory: canViewSummary,
    actingSet,
  };
  const positionsCtx: PositionsCtx = {
    expanded: expandedPos, fullyExpanded: fullyExpandedPos, focusedPath: focusedPosPath,
    toggle: togglePos, openPosition, openUser: (u) => openUser(u), highlightId: highlightPid,
    showMatrix, matrixOut, matrixIn, actingSet,
  };
  const peopleCtx: PeopleCtx = {
    expanded: expandedPeople, fullyExpanded: fullyExpandedPeople, focusedPath: focusedPeoplePath,
    toggle: togglePeople, openUser: (u) => openUser(u), highlightId: highlightUid,
  };

  return (
    <>
      <PageShell className="text-slate-800">
        <div className="overflow-hidden rounded-xl border border-white-02 bg-white">
          <div className="border-b border-white-02 bg-white px-4 py-3 sm:px-4.5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mont font-semibold text-gray-01">Organogram</p>
                <p className="mt-0.5 text-xs text-gray-01">Who reports to whom across the school</p>
              </div>
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                <OrgSearch positions={positions} onJumpUser={jumpToUser} onJumpPosition={jumpToPosition} />
                {canManage && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={routesPath.PROTECTED.STAFF.ORGANOGRAM_MANAGE}>
                      <Settings2 className="size-3.5" /> Manage
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            {canViewSummary && summary && (
              <div className="grid grid-cols-2 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:divide-x sm:divide-white-02">
                <Stat icon={Users} label="Active staff" value={summary.active_staff} accent="bg-indigo-50 text-indigo-500" />
                <Stat icon={Building2} label="Departments" value={summary.departments} accent="bg-slate-100 text-slate-500" />
                <Stat icon={Sparkles} label="Acting" value={summary.acting} accent="bg-amber-50 text-amber-500" />
                <Stat icon={PlaneTakeoff} label="On leave" value={summary.on_leave} accent="bg-amber-50 text-amber-500" />
                <Stat icon={Ban} label="Suspended" value={summary.suspended} accent="bg-rose-50 text-rose-500" />
              </div>
            )}
          </div>

          <div role="tablist" className="flex max-w-full items-center gap-1 overflow-x-auto border-b border-white-02 bg-white px-4 sm:px-4.5">
            {([["people", "People", Users], ["positions", "Posts", Briefcase]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn("relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold transition-colors", tab === id ? "text-indigo-600" : "text-slate-500 hover:text-slate-700")}
              >
                <Icon className="size-4" />{label}
                {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-600" />}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white-02 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-4.5">
            <div className="flex min-w-0 basis-full items-center gap-2 sm:basis-auto">
              <Building2 className="size-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1 sm:w-60 sm:flex-none">
                <SearchSelect
                  options={nodeOptions}
                  value={deptFilter === "ALL" ? "" : String(deptFilter)}
                  onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : "ALL")}
                  placeholder="All units"
                  revealOnSearch
                />
              </div>
              {deptFilter !== "ALL" && (
                <button type="button" onClick={() => setDeptFilter("ALL")} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
                  <X className="size-3" />Reset
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={expandAll} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50">
                <ChevronsDownUp className="size-3.5 rotate-180 text-slate-400" />Expand all
              </button>
              <button type="button" onClick={collapseAll} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50">
                <ChevronsDownUp className="size-3.5 text-slate-400" />Collapse all
              </button>
              {tab === "positions" && (
                <button
                  type="button"
                  aria-pressed={showMatrix}
                  onClick={() => setShowMatrix((v) => !v)}
                  className={cn("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors", showMatrix ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
                >
                  <span className="inline-block h-0 w-4 border-t-2 border-dotted border-current" />Dotted lines
                </button>
              )}
            </div>
          </div>

          {/* The stage: scrolls both ways, zooms with Ctrl and the wheel or the
              controls, and pans by dragging the background. */}
          <div className="relative">
            <ScrollArea
              orientation="both"
              viewportRef={scrollRef}
              onPointerDown={onPanStart}
              onPointerMove={onPanMove}
              onPointerUp={onPanEnd}
              onPointerCancel={onPanEnd}
              className={cn(
                "h-[calc(100dvh-21rem)] min-h-[420px] select-none overscroll-contain",
                panning ? "cursor-grabbing" : "cursor-grab",
              )}
            >
              <div ref={zoomWrapRef} className="w-max min-w-full px-6 py-8" style={{ zoom }}>
                {deptFilter !== "ALL" && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                    <Filter className="size-3.5 text-indigo-500" />
                    Showing <span className="font-semibold text-slate-700">{orgNodes.find((d) => d.id === deptFilter)?.name}</span>
                  </div>
                )}
                {treeLoading ? (
                  <div className="mx-auto w-full max-w-3xl space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
                ) : treeError && tree.length === 0 ? (
                  <div className="mx-auto flex min-h-56 w-full max-w-md flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm font-medium text-destructive">The organogram could not be loaded. Check your connection and try again.</p>
                    <Button variant="outline" size="sm" onClick={() => refetchTree()}>
                      <RefreshCw className="size-3.5" /> Try again
                    </Button>
                  </div>
                ) : viewTree.length === 0 ? (
                  <div className="mx-auto w-full max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-16 text-center">
                    <Info className="mx-auto mb-2 size-6 text-slate-300" />
                    <p className="text-[13px] font-medium text-slate-500">
                      {deptFilter === "ALL" ? "Nobody has been appointed to a post yet." : "Nobody holds a post in this unit yet."}
                    </p>
                    {canManage && deptFilter === "ALL" && (
                      <p className="mt-1 text-[12px] text-slate-400">
                        Build the school&apos;s units and posts in{" "}
                        <Link to={routesPath.PROTECTED.STAFF.ORGANOGRAM_MANAGE} className="font-medium text-primary hover:underline">Manage</Link>,
                        then appoint staff to them.
                      </p>
                    )}
                  </div>
                ) : tab === "positions" ? (
                  <PositionsTree tree={viewTree} ctx={positionsCtx} />
                ) : (
                  <PeopleTree roots={peopleRoots} ctx={peopleCtx} />
                )}
              </div>
            </ScrollArea>

            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 px-1 py-1 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => applyZoom(zoomRef.current - 0.1)}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-11 text-center font-mono text-[11.5px] font-semibold text-slate-600">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => applyZoom(zoomRef.current + 0.1)}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <Plus className="size-3.5" />
              </button>
              <span className="mx-0.5 h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => applyZoom(1)}
                aria-label="Reset zoom"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <Maximize className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </PageShell>

      <DetailDrawer target={target} onClose={() => setTarget(null)} ctx={drawerCtx} />
    </>
  );
}

type SearchResult =
  | { kind: "person"; user: StaffHolder; positionId: number; sub: string }
  | { kind: "position"; id: number; title: string; sub: string };

/**
 * Find a person or a post and jump to it on the chart.
 *
 * Built from the posts' holders, so it searches exactly what the chart shows:
 * a name, a job title, a post or a unit. Never an email; the chart carries none.
 */
function OrgSearch({
  positions, onJumpUser, onJumpPosition,
}: {
  positions: Position[];
  onJumpUser: (u: StaffHolder) => void;
  onJumpPosition: (id: number) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as SearchResult[];
    const out: SearchResult[] = [];
    const seen = new Set<string>();
    for (const p of positions) {
      for (const u of p.current_holders) {
        if (seen.has(u.id)) continue;
        const hay = `${u.full_name} ${u.job_title} ${p.title} ${p.org_node?.name ?? ""}`.toLowerCase();
        if (hay.includes(term)) {
          seen.add(u.id);
          out.push({ kind: "person", user: u, positionId: p.id, sub: [p.title, p.org_node?.name].filter(Boolean).join(" · ") });
        }
        if (out.length >= 6) break;
      }
      if (out.length >= 6) break;
    }
    for (const p of positions) {
      if (p.is_vacant) continue;
      if (`${p.title} ${p.code}`.toLowerCase().includes(term)) {
        out.push({ kind: "position", id: p.id, title: p.title, sub: p.code });
      }
      if (out.length >= 10) break;
    }
    return out.slice(0, 8);
  }, [q, positions]);

  return (
    <div
      className="relative w-full min-w-0 sm:w-80"
      ref={ref}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-300 focus-within:bg-white">
        <Search className="size-4 shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name, post or unit…"
          aria-label="Search the organogram"
          className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
        />
        {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="text-slate-400 hover:text-slate-600"><X className="size-3.5" /></button>}
      </div>
      {open && q.trim() && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {results.length ? results.map((r) => (
            <button
              type="button"
              key={r.kind === "person" ? "u" + r.user.id : "p" + r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { if (r.kind === "person") onJumpUser(r.user); else onJumpPosition(r.id); setOpen(false); setQ(""); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-indigo-50"
            >
              {r.kind === "person" ? <OrgAvatar user={r.user} size={28} /> : <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500"><Briefcase className="size-3.5" /></span>}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-slate-700">{r.kind === "person" ? r.user.full_name : r.title}</div>
                <div className="truncate text-[11px] text-slate-400">{r.sub}</div>
              </div>
              <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", r.kind === "person" ? "bg-indigo-50 text-indigo-500" : "bg-teal-50 text-teal-600")}>
                {r.kind === "person" ? "person" : "post"}
              </span>
            </button>
          )) : <div className="px-3 py-5 text-center text-[12.5px] text-slate-400">No matches for “{q}”</div>}
        </div>
      )}
    </div>
  );
}
