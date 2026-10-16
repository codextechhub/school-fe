import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { CardActions, ClickableCard, Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
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
import {
  getModerationSummary,
  groupModerationRows,
  moderationBoardStages,
  type ModerationBoardStage,
} from "./moderation-board";

/**
 * Moderation: the sheets of moderated programmes, compared across the classes
 * that offer the same subject, for the head of each subject's department to
 * approve or send back with a note.
 *
 * A head sees their own departments' sheets and decides the submitted ones; a
 * reader of the results hub sees every moderated sheet in their branches and
 * decides none, because moderating is the head's by rule (`can_decide`).
 * The board keeps the complete readable queue visible by workflow stage. The
 * waiting summary counts only rows this reader may decide, while a hub reader's
 * submitted sheets remain available for inspection without decision controls.
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
  const sheets = queue?.sheets ?? [];
  const deciding = sheets.some((sheet) => sheet.can_decide);

  return (
    <PageShell className="content-start gap-4" grid>
      <PageHeader
        title="Moderation"
        description="Review submitted sheets by department, compare classes, and move each one towards compilation."
      />
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
          <ModerationBoard
            sheets={sheets}
            branchDimension={queue.branch_dimension}
            onReturn={setReturning}
          />
          {!deciding && <p className="text-sm text-gray-06">Nothing is waiting for your decision. These sheets are for reading.</p>}
        </>
      )}
      {returning && <ReturnDrawer row={returning} onClose={() => setReturning(null)} />}
    </PageShell>
  );
}

function ModerationBoard({
  sheets,
  branchDimension,
  onReturn,
}: {
  sheets: ModerationRow[];
  branchDimension: boolean;
  onReturn: (row: ModerationRow) => void;
}) {
  const summary = getModerationSummary(sheets);
  const groups = groupModerationRows(sheets);

  return (
    <>
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" aria-label="Moderation summary">
        <Metric label="Waiting for you" value={summary.waitingForYou} foot="Submitted sheets you can decide" tone={summary.waitingForYou ? "active" : "default"} />
        <Metric label="Returned" value={summary.returned} foot="With teachers for correction" tone={summary.returned ? "warn" : "default"} />
        <Metric label="Approved" value={summary.approved} foot="Ready for class compilation" />
      </section>

      <section className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-3" aria-label="Moderation sheets by review stage">
        {moderationBoardStages.map((stage) => (
          <BoardColumn
            key={stage.value}
            stage={stage.value}
            title={stage.title}
            description={stage.description}
            sheets={groups[stage.value]}
            branchDimension={branchDimension}
            onReturn={onReturn}
          />
        ))}
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  foot,
  tone = "default",
}: {
  label: string;
  value: number;
  foot: string;
  tone?: "default" | "active" | "warn";
}) {
  const toneClass = tone === "active"
    ? "border-primary/30 bg-primary/5"
    : tone === "warn"
      ? "border-amber-200 bg-amber-50"
      : undefined;
  const valueClass = tone === "active" ? "text-primary" : tone === "warn" ? "text-amber-700" : "text-black-01";

  return (
    <Panel className={`space-y-1.5 px-3.5 py-3 ${toneClass ?? ""}`}>
      <p className="text-xs font-medium text-gray-06">{label}</p>
      <p className={`font-mont text-xl font-semibold ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-06">{foot}</p>
    </Panel>
  );
}

function BoardColumn({
  stage,
  title,
  description,
  sheets,
  branchDimension,
  onReturn,
}: {
  stage: ModerationBoardStage;
  title: string;
  description: string;
  sheets: ModerationRow[];
  branchDimension: boolean;
  onReturn: (row: ModerationRow) => void;
}) {
  return (
    <Panel as="section" className="overflow-hidden">
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3.5 py-3">
        <div className="min-w-0">
          <h2 className="font-mont text-sm font-semibold text-black-01">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-06">{description}</p>
        </div>
        <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-gray-04 px-2 py-1 text-xs font-medium text-gray-06">
          {sheets.length}
        </span>
      </div>
      {sheets.length === 0 ? (
        <p className="px-3.5 py-5 text-sm text-gray-06">{emptyStageText[stage]}</p>
      ) : (
        <ul className="grid gap-2 p-2.5">
          {sheets.map((row) => (
            <ModerationCard
              key={`${row.class.id}:${row.subject.id}`}
              row={row}
              branchDimension={branchDimension}
              onReturn={() => onReturn(row)}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

const emptyStageText: Record<ModerationBoardStage, string> = {
  WAITING: "No sheets are waiting for review.",
  RETURNED: "No sheets are with teachers for correction.",
  APPROVED: "No sheets have been approved yet.",
};

function ModerationCard({
  row,
  branchDimension,
  onReturn,
}: {
  row: ModerationRow;
  branchDimension: boolean;
  onReturn: () => void;
}) {
  const navigate = useNavigate();
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
  const percentage = row.roll > 0 ? Math.min(100, Math.round((row.marked / row.roll) * 100)) : 0;
  const sheetPath = routesPath.PROTECTED.GRADEBOOK.SHEET_ID(row.class.id, row.subject.id);

  const onApprove = async () => {
    const result = await approve({ classId: row.class.id, subjectId: row.subject.id });
    if ("error" in result) return;
    toast.success(`${row.subject.name} approved`, {
      description: `${row.class.name} · it goes on to the class teacher.`,
    });
  };

  return (
    <li>
      <ClickableCard
        label={`Open ${row.subject.name} for ${row.class.name}`}
        onOpen={() => navigate(sheetPath)}
        className="group space-y-3 bg-gray-04/20"
      >
        <div className="flex min-w-0 flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-mont text-base font-semibold text-black-01">
              {row.subject.name} · {row.class.name}
            </h2>
            <p className="text-xs text-gray-06">{meta}</p>
          </div>
          <SheetStatusChip status={row.status} />
        </div>
        <div className="flex items-center gap-2" aria-label={`${row.marked} of ${row.roll} students marked`}>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
          </span>
          <span className="shrink-0 text-xs tabular-nums text-gray-06">{row.marked}/{row.roll}</span>
        </div>
        {showStats && (
          <dl className="grid grid-cols-3 gap-1.5">
            <Stat label="Class average" value={row.class_average ? `${row.class_average}%` : "-"} />
            <Stat
              label="Highest · lowest"
              value={row.highest !== null && row.highest !== undefined ? `${row.highest} · ${row.lowest}` : "-"}
            />
            <Stat label="Pass rate" value={row.pass_rate !== null && row.pass_rate !== undefined ? `${row.pass_rate}%` : "-"} />
          </dl>
        )}
        <p className="text-xs leading-5 text-gray-06">{compare}</p>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            Open full sheet
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
          <CardActions className="flex flex-wrap justify-end gap-2">
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
          </CardActions>
        </div>
      </ClickableCard>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-gray-50 px-2 py-2">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-black-01">{value}</dd>
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
