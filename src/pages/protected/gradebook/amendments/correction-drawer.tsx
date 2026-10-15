import { useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { useGetAmendmentFormQuery, useRaiseAmendmentMutation } from "@/redux/services/gradebook/gradebook-api";
import type { AmendmentForm, AmendmentTarget, Marker, RefusedCell } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";

import { MARKER_LABEL } from "../sheet/cells";
import { correctionCells, draftsFrom, type Draft } from "./correction";

/**
 * Asking for a correction to one student's subject on a published result.
 *
 * The drawer starts from the marks as published and sends only the columns
 * that change, with the reason, which is required. Nothing changes on the
 * report card until someone else approves it: then the sheet takes the new
 * marks, and the card is re-issued as the next version with the old one kept.
 * One correction waits at a time for a student's subject, so while one waits
 * the drawer says so and offers nothing to send.
 *
 * Each column is judged as the score sheet judges it, and a refusal the server
 * still finds is printed under its column.
 *
 * Field Access: asking needs Write on the marks and on the amendment reason.
 * A role that may not read the marks sees the drawer say so.
 */
export function CorrectionDrawer({ target, onClose }: { target: AmendmentTarget; onClose: () => void }) {
  const { data, isLoading, isError, error } = useGetAmendmentFormQuery(target);
  const form = data?.data;
  return form && !isLoading ? (
    <CorrectionForm form={form} onClose={onClose} />
  ) : (
    <DrawerShell open onClose={onClose} title="Ask for a correction" saveLabel="Ask for it" onSave={() => undefined} canSave={false} readOnly>
      {isError ? (
        <p className="text-sm text-[#A32D2D]">{apiErrorMessage(error, "We could not open this result.")}</p>
      ) : (
        <Skeleton className="h-64 w-full" />
      )}
    </DrawerShell>
  );
}

function CorrectionForm({ form, onClose }: { form: AmendmentForm; onClose: () => void }) {
  const sheet = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_SHEET);
  const amendment = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_AMENDMENT);
  const { formatDate } = useSchoolDisplay();
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => draftsFrom(form.components, form.cells ?? []));
  const [reason, setReason] = useState("");
  const [refused, setRefused] = useState<Record<number, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [raise, raising] = useRaiseAmendmentMutation();

  const readsMarks = !!form.cells;
  const writes =
    readsMarks && !form.pending && !sheet.isReadOnly("mark") && !amendment.isReadOnly("amendment_reason");
  const { cells, errors } = correctionCells(form.components, form.cells ?? [], drafts);
  const shown = { ...errors, ...refused };

  const edit = (component: number, next: Partial<Draft>) => {
    setDrafts((current) => ({ ...current, [component]: { ...current[component], ...next } }));
    setRefused(({ [component]: _gone, ...rest }) => rest);
    setFailure(null);
  };

  const onSave = async () => {
    const result = await raise({
      term: form.term.id,
      class: form.class.id,
      student: form.student.id,
      subject: form.subject.id,
      reason: reason.trim(),
      cells,
    });
    if ("error" in result) {
      const problem = parseApiError(result.error);
      const listed = problem.detail.cells as RefusedCell[] | undefined;
      if (problem.code === "CELLS_REFUSED" && Array.isArray(listed)) {
        setRefused(Object.fromEntries(listed.map((cell) => [cell.component, cell.message])));
      } else {
        setFailure(apiErrorMessage(result.error, "The correction could not be asked for."));
      }
      return;
    }
    toast.success("Correction asked for", {
      description: `${form.subject.name} for ${form.student.name}. Nothing changes until it is approved.`,
    });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={`Correct ${form.subject.name}`}
      subtitle={`${form.student.name} · ${form.class.name} · ${form.term.name} · report card version ${form.version}`}
      saveLabel="Ask for the correction"
      onSave={() => void onSave()}
      canSave={writes && cells.length > 0 && Object.keys(errors).length === 0 && !!reason.trim()}
      saving={raising.isLoading}
      readOnly={!writes}
    >
      <div className="space-y-4">
        {form.pending && (
          <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-[#854F0B]">
            A correction to this subject is already waiting, asked for on {formatDate(form.pending.raised_at)}. Another
            can be asked for once it is decided.
          </p>
        )}
        {!readsMarks && (
          <p className="text-sm text-gray-06">Your role cannot read this subject&apos;s marks, so it cannot correct them.</p>
        )}

        {readsMarks && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-black-01">Marks</h3>
            {form.components.map((component) => {
              const draft = drafts[component.id];
              const published = form.cells?.find((cell) => cell.component === component.id);
              const was = published?.marker ? MARKER_LABEL[published.marker] : (published?.mark ?? "-");
              const id = `correction-${component.id}`;
              return (
                <div key={component.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <label htmlFor={id} className="text-sm text-black-01">
                      {component.name} <span className="text-xs text-gray-05">· max {component.max_score} · published {was}</span>
                    </label>
                    <Input
                      id={id}
                      inputMode="numeric"
                      value={draft.marker ? MARKER_LABEL[draft.marker] : draft.text}
                      disabled={!writes || !!draft.marker}
                      aria-invalid={!!shown[component.id]}
                      onChange={(event) => edit(component.id, { text: event.target.value })}
                    />
                    {shown[component.id] && writes && (
                      <p className="mt-1 text-xs text-[#A32D2D]">{shown[component.id]}</p>
                    )}
                  </div>
                  {writes && (
                    <span className="flex gap-1 sm:mt-6">
                      {(["ABS", "EXC"] as Marker[]).map((marker) => (
                        <button
                          key={marker}
                          type="button"
                          aria-pressed={draft.marker === marker}
                          onClick={() => edit(component.id, { marker: draft.marker === marker ? null : marker })}
                          className={cn(
                            "h-9 rounded-md border px-3 text-xs font-semibold",
                            draft.marker === marker ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-gray-06",
                          )}
                        >
                          {MARKER_LABEL[marker]}
                        </button>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
            {"total" in form && (
              <p className="text-xs text-gray-05">
                Published total {form.total ?? "-"} of {form.obtainable ?? "-"}, grade {form.grade ?? "-"}. The total and
                grade are worked out again when the correction is approved.
              </p>
            )}
          </section>
        )}

        {writes && (
          <Field label="Why it needs correcting" required>
            <Textarea
              rows={4}
              maxLength={1000}
              value={reason}
              placeholder="For example: the examination was added up wrongly; the script shows 36."
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        )}
        {failure && <p className="text-sm text-[#A32D2D]">{failure}</p>}
        <p className="text-xs leading-5 text-gray-05">
          Someone other than you approves or rejects it. Once approved, the report card is re-issued as the next
          version and the old one is kept.
        </p>
      </div>
    </DrawerShell>
  );
}
