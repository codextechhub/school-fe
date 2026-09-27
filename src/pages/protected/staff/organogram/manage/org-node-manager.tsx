/**
 * Org units: Division -> Department -> Team, as a collapsible tree.
 *
 * Clicking a row with children opens or closes them. Each unit is school-wide
 * or belongs to one branch; a unit under a branch unit takes that branch, and
 * a branch administrator's edit and delete controls appear only on the units
 * the server reports as theirs to change (`can_manage`). The server stays the
 * authority: a control drawn here is a promise the endpoint also keeps.
 */

import { useMemo, useState } from "react";
import { ChevronRight, Pencil, Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CustomInput } from "@/components/custom/custom-input";
import { SearchSelect } from "@/components/custom/search-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InfoHint } from "@/components/finance-ui";
import PromptModal from "@/components/modal/prompt-modal";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCreateOrgNodeMutation, useDeleteOrgNodeMutation, useGetOrgNodesQuery,
  useGetOrgPositionsQuery, useUpdateOrgNodeMutation,
} from "@/redux/services/staff/organogram-api";
import type { OrgNode, OrgNodeKind, OrgNodeWritePayload, Position } from "@/redux/services/staff/organogram-types";
import { childNodes, divisionsOf, nodeOption, singleId, suggestCode } from "./org-cascade";
import { UnitBranchField } from "./unit-branch-field";
import { NO_BRANCH_PICKED, useUnitBranchRules, type BranchLock } from "./unit-branch-rules";
import { refusalMessage } from "./refusal";
import { asArray, KIND_LABEL } from "../lib/org-helpers";
import { BranchChip } from "../components/org-primitives";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";

type TreeTeam = OrgNode;
type TreeDept = OrgNode & { teams: TreeTeam[] };
type TreeDiv = OrgNode & { depts: TreeDept[] };

function buildOrgTree(nodes: OrgNode[]): { divisions: TreeDiv[]; orphans: OrgNode[] } {
  const divNodes = nodes.filter((n) => n.kind === "DIVISION");
  const deptNodes = nodes.filter((n) => n.kind === "DEPARTMENT");
  const teamNodes = nodes.filter((n) => n.kind === "TEAM");

  const placedDeptIds = new Set<number>();
  const placedTeamIds = new Set<number>();

  const divisions: TreeDiv[] = divNodes.map((div) => {
    const depts = deptNodes
      .filter((d) => d.parent?.id === div.id)
      .map((dept) => {
        const teams = teamNodes.filter((t) => t.parent?.id === dept.id);
        teams.forEach((t) => placedTeamIds.add(t.id));
        placedDeptIds.add(dept.id);
        return { ...dept, teams };
      });
    return { ...div, depts };
  });

  const orphans = [
    ...deptNodes.filter((d) => !placedDeptIds.has(d.id)),
    ...teamNodes.filter((t) => !placedTeamIds.has(t.id)),
  ];
  return { divisions, orphans };
}

const TIER_VARIANT: Record<OrgNodeKind, "outline" | "active" | "inactive"> = {
  DIVISION: "outline", DEPARTMENT: "active", TEAM: "inactive",
};
const TIER_SHORT: Record<OrgNodeKind, string> = {
  DIVISION: "Division", DEPARTMENT: "Dept", TEAM: "Team",
};
const CHILD_NOUN: Record<OrgNodeKind, string> = {
  DIVISION: "dept", DEPARTMENT: "team", TEAM: "",
};

function OrgRow({
  node, depth, isLast, hasChildren, deptIsLast, showBranch,
  onToggle, onEdit, onDelete,
}: {
  node: OrgNode;
  depth: 0 | 1 | 2;
  isLast: boolean;
  hasChildren: boolean;
  /** For a team: whether its department is the last one, which ends the guide line. */
  deptIsLast?: boolean;
  showBranch: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(P.UPDATE_ORG_STRUCTURE) && node.can_manage;
  const canDelete = hasPermission(P.DELETE_ORG_STRUCTURE) && node.can_manage;
  const headText = node.head?.full_name ?? node.head_position?.title;
  const headVacant = !node.head?.full_name && !!node.head_position?.title;
  const childCount = node.children_count;
  const childLabel = CHILD_NOUN[node.kind];

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
      {depth === 2 && (
        <div className={cn("w-5 shrink-0", !deptIsLast && "border-l border-gray-200")} />
      )}
      {depth > 0 && (
        <span className="mr-1 w-4 shrink-0 self-center text-center font-mono text-[11px] text-gray-400">
          {isLast ? "└" : "├"}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 self-center py-2.5">
        <span className={cn(
          "max-w-[220px] truncate text-sm",
          depth === 0 ? "font-semibold text-black-01" : "font-medium text-black-01",
        )}>
          {node.name}
        </span>
        <code className="shrink-0 rounded bg-gray-100 px-1.5 py-px font-mono text-[11px] text-gray-01">
          {node.code}
        </code>
        <Badge variant={TIER_VARIANT[node.kind]} className="h-5 shrink-0 rounded-sm px-1.5 text-[10px]">
          {TIER_SHORT[node.kind]}
        </Badge>
        {showBranch && <BranchChip name={node.branch?.name} />}
        {hasChildren && childCount > 0 && (
          <span className="shrink-0 text-[11px] text-gray-01">
            {childCount} {childLabel}{childCount !== 1 ? "s" : ""}
          </span>
        )}
        {headText && (
          <span className={cn("shrink-0 text-xs text-gray-01", headVacant && "italic")}>
            · {headText}{headVacant ? " (vacant)" : ""}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-center">
        <Badge variant={node.is_active ? "active" : "inactive"} className="h-5 rounded-sm px-1.5 text-[10px]">
          {node.is_active ? "Active" : "Inactive"}
        </Badge>
        {/* Always visible on touch screens, which have no hover. */}
        <div className="flex items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {canEdit && (
            <button
              type="button"
              className="rounded p-1 text-gray-01 hover:bg-pry-01/40 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              aria-label={`Edit ${node.name}`}
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="rounded p-1 text-gray-01 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label={`Delete ${node.name}`}
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
  name: string;
  code: string;
  kind: OrgNodeKind;
  division_id: string;
  parent_id: string;
  /** A branch id, null for the whole school, or NO_BRANCH_PICKED. */
  branch: number | null;
  head_position_id: string;
  description: string;
  is_active: boolean;
}
const empty: FormState = {
  name: "", code: "", kind: "DEPARTMENT", division_id: "", parent_id: "", branch: null,
  head_position_id: "", description: "", is_active: true,
};

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 sm:col-span-2">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function OrgNodeManager() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(P.CREATE_ORG_STRUCTURE);
  const { applies: multiBranch, pinnedBranch, wholeSchool } = useUnitBranchRules();
  const { data: allNodesRes, isLoading, isError, refetch } = useGetOrgNodesQuery({ page_size: 100 });
  const { data: posRes } = useGetOrgPositionsQuery({ page_size: 100 });

  const [createNode, { isLoading: creating }] = useCreateOrgNodeMutation();
  const [updateNode, { isLoading: updating }] = useUpdateOrgNodeMutation();
  const [deleteNode, { isLoading: deleting }] = useDeleteOrgNodeMutation();

  const allNodes = useMemo(() => asArray<OrgNode>(allNodesRes?.data), [allNodesRes]);
  const allPositions = useMemo(() => asArray<Position>(posRes?.data), [posRes]);

  const { divisions, orphans } = useMemo(() => buildOrgTree(allNodes), [allNodes]);

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const toggleCollapse = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrgNode | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [initialForm, setInitialForm] = useState<FormState>(empty);
  const [codeTouched, setCodeTouched] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<OrgNode | null>(null);

  const nodeById = (id: string) => allNodes.find((n) => String(n.id) === id);
  const divisionsList = useMemo(() => divisionsOf(allNodes), [allNodes]);
  const deptsOf = (divisionId: string) => childNodes(allNodes, divisionId, "DEPARTMENT");
  const divisionOptions = useMemo(() => divisionsList.map(nodeOption), [divisionsList]);
  const deptOptions = deptsOf(form.division_id).map(nodeOption);

  // A child of a branch unit takes its branch; a child of a school-wide unit chooses.
  const parent = form.parent_id ? nodeById(form.parent_id) : undefined;
  const branchLock: BranchLock | null = parent?.branch
    ? {
        id: parent.branch.id,
        name: parent.branch.name,
        reason: `${parent.name} belongs to ${parent.branch.name}, so everything under it does too.`,
      }
    : null;
  const effectiveBranch = branchLock ? branchLock.id : pinnedBranch ?? form.branch;

  // Head post: one in this unit's branch or a school-wide one.
  const posOptions = allPositions
    .filter((p) => effectiveBranch === null || !p.branch || p.branch.id === effectiveBranch)
    .map((p) => ({ value: String(p.id), label: `${p.title} (${p.code})` }));

  const defaultBranch = wholeSchool ? null : NO_BRANCH_PICKED;

  const openCreate = () => {
    setEditing(null);
    setCodeTouched(false);
    setRefusal(null);
    const initial = { ...empty, branch: defaultBranch, parent_id: singleId(divisionsList) };
    setInitialForm(initial);
    setForm(initial);
    setOpen(true);
  };
  const openEdit = (n: OrgNode) => {
    setEditing(n);
    setCodeTouched(true);
    setRefusal(null);
    const parentFull = n.parent ? allNodes.find((x) => x.id === n.parent!.id) : undefined;
    const snapshot: FormState = {
      name: n.name, code: n.code, kind: n.kind,
      division_id: n.kind === "TEAM" ? String(parentFull?.parent?.id ?? "") : "",
      parent_id: n.parent ? String(n.parent.id) : "",
      branch: n.branch?.id ?? null,
      head_position_id: n.head_position ? String(n.head_position.id) : "",
      description: n.description ?? "", is_active: n.is_active,
    };
    setInitialForm(snapshot);
    setForm(snapshot);
    setOpen(true);
  };

  const setKind = (kind: OrgNodeKind) =>
    setForm((f) => {
      const next = { ...f, kind, division_id: "", parent_id: "" };
      if (kind === "DEPARTMENT") next.parent_id = singleId(divisionsList);
      else if (kind === "TEAM") {
        next.division_id = singleId(divisionsList);
        if (next.division_id) next.parent_id = singleId(deptsOf(next.division_id));
      }
      return next;
    });

  const setDivision = (division_id: string) =>
    setForm((f) => ({ ...f, division_id, parent_id: singleId(deptsOf(division_id)) }));

  const setName = (name: string) =>
    setForm((f) => ({ ...f, name, code: codeTouched ? f.code : suggestCode(name) }));

  const noDivisions = form.kind !== "DIVISION" && divisionsList.length === 0;
  const noDeptsInDiv = form.kind === "TEAM" && !!form.division_id && deptsOf(form.division_id).length === 0;
  const nameOf = (id: string) => nodeById(id)?.name ?? "";
  const previewChain: string[] =
    form.kind === "DEPARTMENT" && form.parent_id
      ? [nameOf(form.parent_id)]
      : form.kind === "TEAM" && form.division_id
        ? [nameOf(form.division_id), ...(form.parent_id ? [nameOf(form.parent_id)] : [])]
        : [];

  const isDirty = !editing || JSON.stringify(form) !== JSON.stringify(initialForm);
  const branchMissing = multiBranch && effectiveBranch === NO_BRANCH_PICKED;
  const canSubmit =
    !!form.name.trim() && !!form.code.trim() &&
    (form.kind === "DIVISION" || !!form.parent_id) && !branchMissing && isDirty;

  const submit = () => {
    if (!canSubmit) return;
    const body: OrgNodeWritePayload = {
      name: form.name.trim(), code: form.code.trim(), kind: form.kind,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      head_position_id: form.head_position_id ? Number(form.head_position_id) : null,
      description: form.description, is_active: form.is_active,
    };
    // A single-branch school never names a branch; the server files it.
    if (multiBranch) body.branch_id = effectiveBranch;
    const action = editing ? updateNode({ id: editing.id, body }) : createNode(body);
    action.unwrap()
      .then(() => { toast.success(editing ? "Unit updated." : "Unit created."); setOpen(false); })
      .catch((err) => setRefusal(refusalMessage(err, "The unit could not be saved.")));
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteNode(toDelete.id).unwrap()
      .then(() => { toast.success("Unit deleted."); setToDelete(null); })
      .catch((err) => {
        toast.error(refusalMessage(err, "The unit could not be deleted."));
        setToDelete(null);
      });
  };

  const isEmpty = divisions.length === 0 && orphans.length === 0;
  const rowProps = { showBranch: multiBranch };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InfoHint ariaLabel="About org units" className="text-gray-01">
          Units are tiered Division, Department, Team. Click a row to open or close it. A unit&apos;s head post is whoever holds it.
        </InfoHint>
        {canCreate && <Button size="sm" onClick={openCreate}><Plus className="size-4" /> New unit</Button>}
      </div>

      <div className="overflow-hidden rounded-lg border border-white-02">
        {isLoading && isEmpty ? (
          <div className="py-12 text-center text-sm text-gray-01">Loading…</div>
        ) : isError && isEmpty ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm font-medium text-destructive">The units could not be loaded. Check your connection and try again.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" /> Try again
            </Button>
          </div>
        ) : isEmpty ? (
          <div className="px-4 py-12 text-center text-sm text-gray-01">
            No units yet. Start with a division, such as &quot;Academics&quot; or &quot;Administration&quot;.
          </div>
        ) : (
          <div>
            {divisions.map((div) => (
              <div key={div.id}>
                <OrgRow
                  {...rowProps}
                  node={div} depth={0} isLast={false}
                  hasChildren={div.depts.length > 0}
                  onToggle={() => toggleCollapse(div.id)}
                  onEdit={() => openEdit(div)}
                  onDelete={() => setToDelete(div)}
                />
                {!collapsed.has(div.id) && div.depts.map((dept, di) => {
                  const isLastDept = di === div.depts.length - 1;
                  return (
                    <div key={dept.id}>
                      <OrgRow
                        {...rowProps}
                        node={dept} depth={1}
                        isLast={isLastDept}
                        hasChildren={dept.teams.length > 0}
                        onToggle={() => toggleCollapse(dept.id)}
                        onEdit={() => openEdit(dept)}
                        onDelete={() => setToDelete(dept)}
                      />
                      {!collapsed.has(dept.id) && dept.teams.map((team, ti) => (
                        <OrgRow
                          {...rowProps}
                          key={team.id} node={team} depth={2}
                          isLast={ti === dept.teams.length - 1}
                          hasChildren={false}
                          deptIsLast={isLastDept}
                          onToggle={() => {}}
                          onEdit={() => openEdit(team)}
                          onDelete={() => setToDelete(team)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}

            {orphans.length > 0 && (
              <div>
                <div className="border-b border-white-02/60 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                  Parent unit not found
                </div>
                {orphans.map((n) => (
                  <OrgRow
                    {...rowProps}
                    key={n.id} node={n} depth={0} isLast={false} hasChildren={false}
                    onToggle={() => {}} onEdit={() => openEdit(n)} onDelete={() => setToDelete(n)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] p-0 sm:max-w-lg">
          <ScrollArea className="max-h-[90dvh]">
            <div className="grid gap-4 p-6">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit unit" : "New unit"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CustomInput id="n-name" label="Name" isRequired value={form.name} onChange={(e) => setName(e.target.value)} />
                <CustomInput
                  id="n-code" label="Code" isRequired placeholder="ACAD" value={form.code}
                  onChange={(e) => { setCodeTouched(true); setForm((f) => ({ ...f, code: e.target.value })); }}
                />
                <SearchSelect
                  label="Tier" isRequired clearable={false}
                  options={[
                    { value: "DIVISION", label: "Division" },
                    { value: "DEPARTMENT", label: "Department" },
                    { value: "TEAM", label: "Team" },
                  ]}
                  value={form.kind}
                  onChange={(e) => setKind(e.target.value as OrgNodeKind)}
                />
                {form.kind === "DIVISION" && (
                  <div className="flex items-end pb-2 text-xs text-gray-05">Top level: a division has no parent.</div>
                )}
                {form.kind === "DEPARTMENT" && (
                  <SearchSelect
                    label="Division" isRequired revealOnSearch
                    options={divisionOptions} value={form.parent_id}
                    onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                    placeholder="Type a division name or code…" disabled={noDivisions}
                  />
                )}
                {form.kind === "TEAM" && (
                  <>
                    <SearchSelect
                      label="Division" isRequired revealOnSearch
                      options={divisionOptions} value={form.division_id}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="Type a division name or code…" disabled={noDivisions}
                    />
                    <SearchSelect
                      label="Department" isRequired revealOnSearch
                      options={deptOptions} value={form.parent_id}
                      onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                      placeholder={form.division_id ? "Type a department name or code…" : "Pick a division first"}
                      disabled={!form.division_id || noDeptsInDiv}
                    />
                  </>
                )}
                {noDivisions && <Hint>There are no divisions yet. Create a division first, then come back to add this {KIND_LABEL[form.kind].toLowerCase()}.</Hint>}
                {noDeptsInDiv && <Hint>{nameOf(form.division_id)} has no departments yet. Create one first, then add this team.</Hint>}
                {previewChain.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 rounded-md bg-gray-03 px-3 py-2 text-xs text-gray-06 sm:col-span-2">
                    <span className="font-semibold">Sits under:</span>
                    {previewChain.map((name, i) => (
                      <span key={`${name}-${i}`} className="inline-flex items-center gap-1">
                        {i > 0 && <ChevronRight className="size-3 text-gray-02" />}
                        <span className="font-medium text-black-01">{name}</span>
                      </span>
                    ))}
                    <ChevronRight className="size-3 text-gray-02" />
                    <span className="italic">{form.name.trim() || `new ${KIND_LABEL[form.kind].toLowerCase()}`}</span>
                  </div>
                )}
                <UnitBranchField
                  value={form.branch}
                  onChange={(branch) => setForm((f) => ({ ...f, branch }))}
                  lockedTo={branchLock}
                />
                <SearchSelect
                  label="Head post" containerClass="sm:col-span-2" revealOnSearch
                  options={posOptions} value={form.head_position_id}
                  onChange={(e) => setForm((f) => ({ ...f, head_position_id: e.target.value }))}
                  placeholder="Type a post title or code…"
                />
                <div className="sm:col-span-2">
                  <label htmlFor="n-description" className="mb-1.5 block text-sm font-medium text-black-01">Description</label>
                  <Textarea id="n-description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
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

      <PromptModal
        isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Delete unit?"
        description={
          toDelete?.children_count
            ? `"${toDelete.name}" has ${toDelete.children_count} unit${toDelete.children_count === 1 ? "" : "s"} under it. ` +
              "Delete or move them first; the server will refuse this delete."
            : `This permanently removes "${toDelete?.name}". Posts still in it block the delete.`
        }
        onConfirmText="Delete" canCancel loading={deleting}
        onConfirmClass="bg-error-01 text-white hover:bg-error-01/90"
      />
    </div>
  );
}
