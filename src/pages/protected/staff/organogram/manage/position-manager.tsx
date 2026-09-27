/**
 * Posts: the seats on the chart, as a collapsible tree along the solid line.
 *
 * Clicking a row with posts under it opens or closes them. Each row shows how
 * many of its seats are filled, which the chart itself deliberately does not:
 * the size of the establishment is an administrator's question.
 *
 * A post sits in any unit, not only a team. A small school runs a Principal
 * in its top division and a Bursar in an Accounts department with no teams at
 * all, and a chart that demanded a team for each would demand teams nobody
 * has. The deepest unit picked is the one the post belongs to, and the post
 * takes that unit's branch.
 *
 * Edit, delete and appoint appear only on posts the server reports as the
 * reader's to change (`can_manage`).
 */

import { useMemo, useState } from "react";
import { ChevronRight, Pencil, Plus, RefreshCw, Trash2, TriangleAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CustomInput } from "@/components/custom/custom-input";
import { SearchSelect } from "@/components/custom/search-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InfoHint } from "@/components/finance-ui";
import PromptModal from "@/components/modal/prompt-modal";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCreateOrgPositionMutation, useDeleteOrgPositionMutation, useGetOrgNodesQuery,
  useGetOrgPositionsQuery, useUpdateOrgPositionMutation,
} from "@/redux/services/staff/organogram-api";
import type { OrgNode, Position, PositionWritePayload } from "@/redux/services/staff/organogram-types";
import { useActionParam } from "@/hooks/use-action-param";
import { childNodes, divisionsOf, nodeOption } from "./org-cascade";
import { AppointDialog } from "./appoint-dialog";
import { refusalMessage } from "./refusal";
import { useUnitBranchRules } from "./unit-branch-rules";
import { asArray } from "../lib/org-helpers";
import { BranchChip } from "../components/org-primitives";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";

type PosNode = Position & { children: PosNode[] };

function buildPosTree(positions: Position[]): PosNode[] {
  const map = new Map<number, PosNode>(
    positions.map((p) => [p.id, { ...p, children: [] as PosNode[] }]),
  );
  const roots: PosNode[] = [];
  for (const node of map.values()) {
    const parentId = node.reports_to?.id;
    if (parentId != null && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const byTitle = (a: PosNode, b: PosNode) => a.title.localeCompare(b.title);
  for (const n of map.values()) n.children.sort(byTitle);
  roots.sort(byTitle);
  return roots;
}

/** One rendered row. `guides[i]` draws the vertical line at depth i while siblings remain. */
type FlatPos = { node: PosNode; depth: number; isLast: boolean; guides: boolean[] };

function flattenPosTree(roots: PosNode[], collapsed: Set<number>): FlatPos[] {
  const out: FlatPos[] = [];
  function visit(nodes: PosNode[], depth: number, guides: boolean[]) {
    nodes.forEach((node, i) => {
      const isLast = i === nodes.length - 1;
      out.push({ node, depth, isLast, guides: [...guides] });
      if (node.children.length > 0 && !collapsed.has(node.id)) {
        visit(node.children, depth + 1, [...guides, !isLast]);
      }
    });
  }
  visit(roots, 0, []);
  return out;
}

function PosRow({
  item, showBranch, onToggle, onEdit, onDelete, onAppoint,
}: {
  item: FlatPos;
  showBranch: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAppoint: () => void;
}) {
  const { hasPermission } = usePermissions();
  const { node, depth, isLast, guides } = item;
  const canEdit = hasPermission(P.UPDATE_ORG_STRUCTURE) && node.can_manage;
  const canDelete = hasPermission(P.DELETE_ORG_STRUCTURE) && node.can_manage;
  const canAppoint = hasPermission(P.APPOINT_TO_POST) && node.can_manage;
  const hasChildren = node.children.length > 0;
  const filled = node.headcount - node.open_seats;

  return (
    <div
      className={cn(
        "group relative flex min-h-[44px] items-stretch pr-3",
        "transition-colors hover:bg-pry-01/20",
        "border-b border-white-02/40 last:border-b-0",
        depth === 0 && "bg-gray-50/80",
        hasChildren && "cursor-pointer select-none",
      )}
      onClick={hasChildren ? onToggle : undefined}
    >
      <div className="w-2 shrink-0" />
      {/* Depth guides stop at four on a phone, so a deep line keeps its text. */}
      {guides.map((showLine, i) => (
        <div key={i} className={cn("w-5 shrink-0", showLine && "border-l border-gray-200", i >= 4 && "hidden sm:block")} />
      ))}
      {depth > 0 && (
        <span className="mr-0.5 w-4 shrink-0 self-center text-center font-mono text-[11px] text-gray-400">
          {isLast ? "└" : "├"}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 self-center py-2.5">
        <span className={cn(
          "max-w-[240px] truncate text-sm",
          depth === 0 ? "font-semibold text-black-01" : "font-medium text-black-01",
        )}>
          {node.title}
        </span>
        <code className="shrink-0 rounded bg-gray-100 px-1.5 py-px font-mono text-[11px] text-gray-01">
          {node.code}
        </code>
        {node.org_node && (
          <span className="shrink-0 text-[11px] text-gray-01">{node.org_node.name}</span>
        )}
        {showBranch && <BranchChip name={node.branch?.name} />}
        <span className={cn("shrink-0 text-[11px]", node.is_vacant ? "text-amber-600" : "text-gray-01")}>
          {filled}/{node.headcount} filled
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-center">
        <Badge variant={node.is_active ? "active" : "inactive"} className="h-5 rounded-sm px-1.5 text-[10px]">
          {node.is_active ? "Active" : "Inactive"}
        </Badge>
        <div className="flex items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {canAppoint && (
            <button
              type="button"
              className="rounded p-1 text-gray-01 hover:bg-pry-01/40 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onAppoint(); }}
              aria-label={`Appoint to ${node.title}`}
            >
              <UserPlus className="size-3.5" />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="rounded p-1 text-gray-01 hover:bg-pry-01/40 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              aria-label={`Edit ${node.title}`}
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="rounded p-1 text-gray-01 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label={`Delete ${node.title}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface FormState {
  title: string;
  code: string;
  division_id: string;
  department_id: string;
  team_id: string;
  reports_to_id: string;
  headcount: string;
  is_active: boolean;
}
const empty: FormState = {
  title: "", code: "", division_id: "", department_id: "", team_id: "",
  reports_to_id: "", headcount: "1", is_active: true,
};

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 sm:col-span-2">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** The unit a post belongs to: the deepest one picked. */
const chosenUnitId = (f: FormState) => f.team_id || f.department_id || f.division_id;

export default function PositionManager() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(P.CREATE_ORG_STRUCTURE);
  const { applies: multiBranch } = useUnitBranchRules();
  const { data: allPosRes, isLoading, isError, refetch } = useGetOrgPositionsQuery({ page_size: 100 });
  const { data: nodesRes } = useGetOrgNodesQuery({ page_size: 100 });

  const [createPos, { isLoading: creating }] = useCreateOrgPositionMutation();
  const [updatePos, { isLoading: updating }] = useUpdateOrgPositionMutation();
  const [deletePos, { isLoading: deleting }] = useDeleteOrgPositionMutation();

  const allPositions = useMemo(() => asArray<Position>(allPosRes?.data), [allPosRes]);
  const allNodes = useMemo(() => asArray<OrgNode>(nodesRes?.data), [nodesRes]);
  // Only units the reader may put a post in.
  const manageableNodes = useMemo(() => allNodes.filter((n) => n.can_manage), [allNodes]);

  const posRoots = useMemo(() => buildPosTree(allPositions), [allPositions]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const toggleCollapse = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const flatItems = useMemo(() => flattenPosTree(posRoots, collapsed), [posRoots, collapsed]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Position | null>(null);
  const [appointing, setAppointing] = useState<Position | null>(null);

  const divisions = useMemo(() => divisionsOf(manageableNodes), [manageableNodes]);
  const deptsOf = (divisionId: string) => childNodes(manageableNodes, divisionId, "DEPARTMENT");
  const teamsOf = (deptId: string) => childNodes(manageableNodes, deptId, "TEAM");
  // A branch-bound reader may put a post in a department of theirs under a school-wide division.
  const divisionOptions = useMemo(() => {
    const reachable = new Map<number, OrgNode>();
    for (const d of divisions) reachable.set(d.id, d);
    for (const n of manageableNodes) {
      if (n.kind !== "DEPARTMENT" || !n.parent) continue;
      const parent = allNodes.find((x) => x.id === n.parent!.id);
      if (parent) reachable.set(parent.id, parent);
    }
    return [...reachable.values()].map(nodeOption);
  }, [divisions, manageableNodes, allNodes]);
  const deptOptions = deptsOf(form.division_id).map(nodeOption);
  const teamOptions = teamsOf(form.department_id).map(nodeOption);

  const nodeById = (id: string) => allNodes.find((n) => String(n.id) === id);
  const unit = nodeById(chosenUnitId(form));
  const divisionManageable = !!form.division_id && !!nodeById(form.division_id)?.can_manage;

  // A post reports to a school-wide post or one in its own branch.
  const unitBranch = unit?.branch?.id ?? null;
  const reportsToOptions = allPositions
    .filter((p) => p.id !== editing?.id)
    .filter((p) => !p.branch || unitBranch === null || p.branch.id === unitBranch)
    .map((p) => ({ value: String(p.id), label: `${p.title} (${p.code})` }));

  const setDivision = (division_id: string) =>
    setForm((f) => ({ ...f, division_id, department_id: "", team_id: "" }));
  const setDepartment = (department_id: string) =>
    setForm((f) => ({ ...f, department_id, team_id: "" }));

  const openCreate = () => {
    setEditing(null);
    setRefusal(null);
    setForm({ ...empty, division_id: divisionOptions.length === 1 ? divisionOptions[0].value : "" });
    setOpen(true);
  };
  useActionParam("new", canCreate, openCreate);

  const openEdit = (p: Position) => {
    setEditing(p);
    setRefusal(null);
    const node = allNodes.find((n) => n.id === p.org_node?.id);
    let division_id = "", department_id = "", team_id = "";
    if (node?.kind === "TEAM") {
      team_id = String(node.id);
      department_id = String(node.parent?.id ?? "");
      division_id = String(nodeById(department_id)?.parent?.id ?? "");
    } else if (node?.kind === "DEPARTMENT") {
      department_id = String(node.id);
      division_id = String(node.parent?.id ?? "");
    } else if (node?.kind === "DIVISION") {
      division_id = String(node.id);
    }
    setForm({
      title: p.title, code: p.code,
      division_id, department_id, team_id,
      reports_to_id: p.reports_to ? String(p.reports_to.id) : "",
      headcount: String(p.headcount), is_active: p.is_active,
    });
    setOpen(true);
  };

  const noDivisions = divisionOptions.length === 0;
  // A branch-bound reader under a school-wide division must go one tier deeper.
  const needsDepartment = !!form.division_id && !divisionManageable;
  const nameOf = (id: string) => nodeById(id)?.name ?? "";
  const previewChain = [form.division_id, form.department_id, form.team_id].filter(Boolean).map(nameOf);

  const canSubmit =
    !!form.title.trim() && !!form.code.trim() && !!chosenUnitId(form) &&
    !(needsDepartment && !form.department_id);

  const submit = () => {
    if (!canSubmit) return;
    const body: PositionWritePayload = {
      title: form.title.trim(), code: form.code.trim(),
      org_node_id: Number(chosenUnitId(form)),
      reports_to_id: form.reports_to_id ? Number(form.reports_to_id) : null,
      headcount: Math.max(Number(form.headcount) || 1, 1),
      is_active: form.is_active,
    };
    const action = editing ? updatePos({ id: editing.id, body }) : createPos(body);
    action.unwrap()
      .then(() => { toast.success(editing ? "Post updated." : "Post created."); setOpen(false); })
      .catch((err) => setRefusal(refusalMessage(err, "The post could not be saved.")));
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deletePos(toDelete.id).unwrap()
      .then(() => { toast.success("Post deleted."); setToDelete(null); })
      .catch((err) => {
        toast.error(refusalMessage(err, "The post could not be deleted."));
        setToDelete(null);
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InfoHint ariaLabel="About posts" className="text-gray-01">
          Posts are ordered by who reports to whom. Click a row to open or close the posts under it. Appoint somebody from a post&apos;s row.
        </InfoHint>
        {canCreate && <Button size="sm" onClick={openCreate}><Plus className="size-4" /> New post</Button>}
      </div>

      <div className="overflow-hidden rounded-lg border border-white-02">
        {isLoading && flatItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-01">Loading…</div>
        ) : isError && flatItems.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm font-medium text-destructive">The posts could not be loaded. Check your connection and try again.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" /> Try again
            </Button>
          </div>
        ) : flatItems.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-01">
            No posts yet. Create a unit first, then add its posts, starting with the head of the school.
          </div>
        ) : (
          <div>
            {flatItems.map((item) => (
              <PosRow
                key={item.node.id}
                item={item}
                showBranch={multiBranch}
                onToggle={() => toggleCollapse(item.node.id)}
                onEdit={() => openEdit(item.node)}
                onDelete={() => setToDelete(item.node)}
                onAppoint={() => setAppointing(item.node)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] p-0 sm:max-w-lg">
          <ScrollArea className="max-h-[90dvh]">
            <div className="grid gap-4 p-6">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit post" : "New post"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CustomInput id="p-title" label="Title" isRequired placeholder="Head of Primary" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                <CustomInput id="p-code" label="Code" isRequired placeholder="HOP" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />

                <SearchSelect
                  label="Division" isRequired revealOnSearch
                  options={divisionOptions} value={form.division_id}
                  onChange={(e) => setDivision(e.target.value)}
                  placeholder="Type a division name or code…" disabled={noDivisions}
                />
                <SearchSelect
                  label="Department" isRequired={needsDepartment} revealOnSearch
                  options={deptOptions} value={form.department_id}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder={form.division_id ? "Optional: type a department…" : "Pick a division first"}
                  disabled={!form.division_id || deptOptions.length === 0}
                />
                <SearchSelect
                  label="Team" revealOnSearch containerClass="sm:col-span-2"
                  options={teamOptions} value={form.team_id}
                  onChange={(e) => setForm((f) => ({ ...f, team_id: e.target.value }))}
                  placeholder={form.department_id ? "Optional: type a team…" : "Pick a department first"}
                  disabled={!form.department_id || teamOptions.length === 0}
                />

                {noDivisions && <Hint>There are no units you can add a post to yet. Create a division on the Units tab first.</Hint>}
                {needsDepartment && !form.department_id && (
                  <Hint>{nameOf(form.division_id)} applies to the whole school, so pick one of your branch&apos;s departments in it.</Hint>
                )}

                {previewChain.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 rounded-md bg-gray-03 px-3 py-2 text-xs text-gray-06 sm:col-span-2">
                    <span className="font-semibold">Sits in:</span>
                    {previewChain.map((name, i) => (
                      <span key={`${name}-${i}`} className="inline-flex items-center gap-1">
                        {i > 0 && <ChevronRight className="size-3 text-gray-02" />}
                        <span className="font-medium text-black-01">{name}</span>
                      </span>
                    ))}
                    {multiBranch && unit && (
                      <span className="ml-1 text-gray-05">({unit.branch?.name ?? "School-wide"})</span>
                    )}
                  </div>
                )}

                <SearchSelect
                  label="Reports to" revealOnSearch
                  options={reportsToOptions} value={form.reports_to_id}
                  onChange={(e) => setForm((f) => ({ ...f, reports_to_id: e.target.value }))}
                  placeholder="Type a post title or code…"
                />
                <CustomInput
                  id="p-headcount" label="Headcount" type="number" min={1}
                  value={form.headcount} onChange={(e) => setForm((f) => ({ ...f, headcount: e.target.value }))}
                />
                <label className="flex items-center justify-between gap-2 rounded-md border border-white-02 px-3 py-2 text-sm sm:col-span-2">
                  Active <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                </label>
                {refusal && (
                  <p role="alert" className="rounded-md bg-error-01/10 px-3 py-2 text-sm text-error-01 sm:col-span-2">{refusal}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} loading={creating || updating} disabled={!canSubmit}>
                  {editing ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AppointDialog position={appointing} onClose={() => setAppointing(null)} />

      <PromptModal
        isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Delete post?"
        description={`This permanently removes "${toDelete?.title}". A post anybody has ever held keeps its history, and the server refuses to delete it; mark it inactive instead.`}
        onConfirmText="Delete" canCancel loading={deleting}
        onConfirmClass="bg-error-01 text-white hover:bg-error-01/90"
      />
    </div>
  );
}
