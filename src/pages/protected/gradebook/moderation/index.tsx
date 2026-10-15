import { useState } from "react";
import { Link } from "react-router";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import {
  useApproveSheetMutation,
  useGetModerationQueueQuery,
  useReturnSheetMutation,
} from "@/redux/services/gradebook/gradebook-api";
import type { ModerationRow } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { SheetStatusChip } from "../components/sheet-status-chip";

/**
 * Moderation: the sheets of moderated programmes, compared across the classes
 * that offer the same subject, for the head of each subject's department to
 * approve or send back with a note.
 *
 * A head sees their own departments' sheets and decides the submitted ones; a
 * reader of the results hub sees every moderated sheet in their branches and
 * decides none, because moderating is the head's by rule (`can_decide`).
 * Sheets waiting for a decision come first.
 *
 * The class figures (average, highest and lowest, pass rate) follow the
 * class-figures Field Access switch, and the return note its own: a role that
 * may not write the note cannot return a sheet, since a return needs one.
 */
export default function ModerationQueue() {
  const { branch } = useBranchLens();
  const { data, isLoading, isError, refetch } = useGetModerationQueueQuery({ branch });
  const [returning, setReturning] = useState<ModerationRow | null>(null);
  const queue = data?.data;
  const sheets = [...(queue?.sheets ?? [])].sort((a, b) => Number(b.can_decide) - Number(a.can_decide));
  const deciding = sheets.some((sheet) => sheet.can_decide);

  return (
    <PageShell className="content-start gap-4" grid>
      <div className="min-w-0">
        <h1 className="font-mont text-lg font-semibold text-black-01">Moderation</h1>
        <p className="text-sm text-gray-06">
          Sheets in moderated programmes, compared across the classes that offer them. Approve a sheet, or return it
          to its teacher with a note.
        </p>
      </div>
      {isError ? (
        <OutlinedNotice
          icon={ClipboardCheck}
          title="We could not load the moderation queue"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !queue ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : sheets.length === 0 ? (
        <OutlinedNotice
          icon={ClipboardCheck}
          title="No sheet to moderate"
          body="No sheet in a moderated programme has been started this term, or none belongs to a department you head."
        />
      ) : (
        <>
          {!deciding && (
            <p className="text-sm text-gray-06">Nothing is waiting for your decision. These are for reading.</p>
          )}
          <ul className="grid gap-3">
            {sheets.map((row) => (
              <ModerationCard
                key={`${row.class.id}:${row.subject.id}`}
                row={row}
                branchDimension={queue.branch_dimension}
                onReturn={() => setReturning(row)}
              />
            ))}
          </ul>
        </>
      )}
      {returning && <ReturnDrawer row={returning} onClose={() => setReturning(null)} />}
    </PageShell>
  );
}

function ModerationCard({
  row,
  branchDimension,
  onReturn,
}: {
  row: ModerationRow;
  branchDimension: boolean;
  onReturn: () => void;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_SHEET);
  const [approve, approving] = useApproveSheetMutation();
  const showStats = !access.isHidden("class_average");
  const mayReturn = !access.isReadOnly("note");
  const meta = [
    row.main_teacher?.name ?? "No main teacher",
    `${row.marked} of ${row.roll} marked`,
    branchDimension ? row.branch?.name : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const compare = row.compare.length
    ? `Compared with ${row.compare.join(" and ")}, which offer${row.compare.length === 1 ? "s" : ""} the same subject.`
    : "No other class offers this subject this term.";

  const onApprove = async () => {
    const result = await approve({ classId: row.class.id, subjectId: row.subject.id });
    if ("error" in result) return;
    toast.success(`${row.subject.name} approved`, {
      description: `${row.class.name} · it goes on to the class teacher.`,
    });
  };

  return (
    <li>
      <Panel as="section" className="space-y-3 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-mont text-base font-semibold text-black-01">
              {row.subject.name} · {row.class.name}
            </h2>
            <p className="text-xs text-gray-06">{meta}</p>
          </div>
          <SheetStatusChip status={row.status} />
        </div>
        {showStats && (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Class average" value={row.class_average ? `${row.class_average}%` : "—"} />
            <Stat
              label="Highest · lowest"
              value={row.highest !== null && row.highest !== undefined ? `${row.highest} · ${row.lowest}` : "—"}
            />
            <Stat label="Pass rate" value={row.pass_rate !== null && row.pass_rate !== undefined ? `${row.pass_rate}%` : "—"} />
          </dl>
        )}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-gray-06">{compare}</p>
          <span className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link to={routesPath.PROTECTED.GRADEBOOK.SHEET_ID(row.class.id, row.subject.id)}>View sheet</Link>
            </Button>
            {row.can_decide && (
              <>
                {mayReturn && (
                  <Button size="sm" variant="outline" onClick={onReturn}>
                    Return with a note
                  </Button>
                )}
                <Button size="sm" disabled={approving.isLoading} onClick={() => void onApprove()}>
                  Approve
                </Button>
              </>
            )}
          </span>
        </div>
      </Panel>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-gray-50 px-3 py-2">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd className="text-base font-semibold text-black-01">{value}</dd>
    </div>
  );
}

/** A note is required: it is pinned above the grid for the teacher to act on. */
function ReturnDrawer({ row, onClose }: { row: ModerationRow; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [send, sending] = useReturnSheetMutation();
  const teacher = row.main_teacher?.name ?? "its main teacher";

  const onSave = async () => {
    const result = await send({ classId: row.class.id, subjectId: row.subject.id, note: note.trim() });
    if ("error" in result) return;
    toast.success(`${row.subject.name} returned`, {
      description: `${row.class.name} · reopened for ${teacher}, with your note.`,
    });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={`Return ${row.subject.name} · ${row.class.name}`}
      subtitle={`It reopens for ${teacher}, with your note pinned above the grid.`}
      saveLabel="Return with this note"
      onSave={() => void onSave()}
      canSave={!!note.trim()}
      saving={sending.isLoading}
    >
      <div className="space-y-3">
        <Field label="Why it is going back" required>
          <Textarea
            rows={5}
            value={note}
            placeholder="For example: the examination column looks scaled. Please check it against the paper before resubmitting."
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <p className="text-xs leading-5 text-gray-05">
          Nothing is deleted. Every mark stays as it is until the teacher changes it.
        </p>
      </div>
    </DrawerShell>
  );
}
