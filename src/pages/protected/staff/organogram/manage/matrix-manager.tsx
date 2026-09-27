/**
 * Dotted lines: a second reporting relationship between two posts, beside the
 * solid line. The Head of Sciences at Lekki reports to the Lekki Head Teacher,
 * and also answers to the school-wide Director of Studies for the curriculum.
 *
 * One dotted line per pair of posts. Like a solid line, it never joins two
 * different branches; the server refuses it and says why.
 */

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import CustomTable from "@/components/custom/custom-table";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/custom/custom-input";
import { SearchSelect } from "@/components/custom/search-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PromptModal from "@/components/modal/prompt-modal";
import {
  useCreateOrgMatrixReportMutation, useDeleteOrgMatrixReportMutation,
  useGetOrgMatrixReportsQuery, useGetOrgPositionsQuery,
} from "@/redux/services/staff/organogram-api";
import type { MatrixReport, MatrixReportWritePayload, Position } from "@/redux/services/staff/organogram-types";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { asArray } from "../lib/org-helpers";
import { refusalMessage } from "./refusal";

const HEADERS = ["Post", "Also reports to", "Why", ""];

interface FormState {
  position_id: string;
  reports_to_id: string;
  relationship_label: string;
}
const empty: FormState = { position_id: "", reports_to_id: "", relationship_label: "" };

export default function MatrixManager() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(P.CREATE_ORG_STRUCTURE);
  const canDelete = hasPermission(P.DELETE_ORG_STRUCTURE);
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, refetch } = useGetOrgMatrixReportsQuery({ page, page_size: 20 });
  const { data: posRes } = useGetOrgPositionsQuery({ page_size: 100 });

  const [createMatrix, { isLoading: creating }] = useCreateOrgMatrixReportMutation();
  const [deleteMatrix, { isLoading: deleting }] = useDeleteOrgMatrixReportMutation();

  const items = useMemo(() => asArray<MatrixReport>(data?.data), [data]);
  const positions = useMemo(() => asArray<Position>(posRes?.data), [posRes]);
  const option = (p: Position) => ({
    value: String(p.id),
    label: p.branch ? `${p.title} · ${p.code} · ${p.branch.name}` : `${p.title} · ${p.code}`,
  });
  // The post that gains the line must be one the reader manages.
  const fromOptions = positions.filter((p) => p.can_manage).map(option);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MatrixReport | null>(null);

  const chosen = positions.find((p) => String(p.id) === form.position_id);
  // Same rule as a solid line: school-wide, or the same branch.
  const toOptions = positions
    .filter((p) => String(p.id) !== form.position_id)
    .filter((p) => !p.branch || !chosen?.branch || p.branch.id === chosen.branch.id)
    .map(option);

  const openCreate = () => { setForm(empty); setRefusal(null); setOpen(true); };

  const canSubmit = !!form.position_id && !!form.reports_to_id && form.position_id !== form.reports_to_id;
  const submit = () => {
    if (!canSubmit) return;
    const body: MatrixReportWritePayload = {
      position_id: Number(form.position_id),
      reports_to_id: Number(form.reports_to_id),
      relationship_label: form.relationship_label.trim(),
    };
    createMatrix(body).unwrap()
      .then(() => { toast.success("Dotted line added."); setOpen(false); })
      .catch((err) => setRefusal(refusalMessage(err, "The dotted line could not be added.")));
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMatrix(toDelete.id).unwrap()
      .then(() => { toast.success("Dotted line removed."); setToDelete(null); })
      .catch((err) => {
        toast.error(refusalMessage(err, "The dotted line could not be removed."));
        setToDelete(null);
      });
  };

  const tableData = useMemo(
    () => items.map((m) => ({
      position: <span className="text-sm font-medium text-black-01">{m.position.title}</span>,
      reports_to: <span className="text-sm">{m.reports_to.title}</span>,
      relationship: <span className="text-sm text-gray-01">{m.relationship_label || "-"}</span>,
      actions: canDelete && m.can_manage ? (
        <button
          type="button"
          className="rounded p-1.5 text-gray-01 hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); setToDelete(m); }}
          aria-label={`Remove the dotted line from ${m.position.title} to ${m.reports_to.title}`}
        >
          <Trash2 className="size-4" />
        </button>
      ) : null,
      _raw: m,
    })),
    [items, canDelete],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-01">A second line of reporting beside the solid one. One per pair of posts.</p>
        {canCreate && <Button size="sm" onClick={openCreate}><Plus className="size-4" /> New dotted line</Button>}
      </div>

      {isError && !isFetching && items.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-white-02 px-4 text-center">
          <p className="text-sm font-medium text-destructive">The dotted lines could not be loaded. Check your connection and try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3.5" /> Try again
          </Button>
        </div>
      ) : (
        <CustomTable
          tableHeaderList={HEADERS}
          tableBodyList={tableData}
          loading={isLoading || isFetching}
          currentPage={page}
          totalPage={data?.pagination?.totalPages ?? 0}
          onPageChange={(p) => setPage(Number(p))}
          emptyText="No dotted lines yet."
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New dotted line</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <SearchSelect
              label="Post" isRequired options={fromOptions} value={form.position_id}
              onChange={(e) => setForm((f) => ({ ...f, position_id: e.target.value, reports_to_id: "" }))}
              placeholder="Select a post"
            />
            <SearchSelect
              label="Also reports to" isRequired options={toOptions} value={form.reports_to_id}
              onChange={(e) => setForm((f) => ({ ...f, reports_to_id: e.target.value }))}
              placeholder={form.position_id ? "Select a post" : "Pick the post first"}
              disabled={!form.position_id}
            />
            <CustomInput
              id="m-label" label="Why" placeholder="e.g. Curriculum oversight"
              value={form.relationship_label}
              onChange={(e) => setForm((f) => ({ ...f, relationship_label: e.target.value }))}
            />
            {refusal && <p role="alert" className="rounded-md bg-error-01/10 px-3 py-2 text-sm text-error-01">{refusal}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={creating} disabled={!canSubmit}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PromptModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove dotted line?"
        description={toDelete ? `Remove the dotted line from "${toDelete.position.title}" to "${toDelete.reports_to.title}"?` : ""}
        onConfirmText="Remove"
        canCancel
        loading={deleting}
        onConfirmClass="bg-error-01 text-white hover:bg-error-01/90"
      />
    </div>
  );
}
