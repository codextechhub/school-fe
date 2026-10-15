import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ClipboardList, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/custom/surface";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import {
  useGetMySheetsQuery,
  useGetSheetQuery,
  useSubmitSheetMutation,
} from "@/redux/services/gradebook/gradebook-api";
import type { Sheet, SheetKey } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { examPaperText } from "../components/exam-paper";
import { isLockedStatus } from "../components/sheet-status";
import { SheetStatusChip } from "../components/sheet-status-chip";
import { rowsWithBlanks } from "./cells";
import { SheetGrid } from "./sheet-grid";
import { SheetPhone } from "./sheet-phone";
import { useSheetSaver } from "./use-sheet-saver";

/**
 * One subject's score sheet for one class and term.
 *
 * Who may do what is the server's rule, read from the sheet itself: it says in
 * `can_enter` whether this reader may save marks now (the main teacher, or a
 * holder of `enter_any`, on a sheet that is not locked) and in `can_submit`
 * whether every cell is filled. Everyone else who may open the sheet (an
 * assistant, the class teacher, the head of department, an administrator)
 * reads it.
 *
 * **Desktop and phone read the same sheet differently.** From `md` up it is the
 * grid, students down and components across. Below that the grid does not fit,
 * so it is one student at a time with the components as inputs and previous and
 * next at the foot. Both save through the same hook.
 *
 * Field Access: a reader who may not read marks sees the header and a notice,
 * never an empty grid that would read as nothing entered. A reader who may read
 * but not write them sees the grid without inputs. The worked-out figures and
 * the progress count go when `row_result` is hidden, and the return note when
 * `note` is.
 */
export default function ScoreSheet() {
  const params = useParams();
  const [search] = useSearchParams();
  const term = Number(search.get("term")) || undefined;
  const key: SheetKey = { classId: Number(params.classId), subjectId: Number(params.subjectId), term };
  const valid = Number.isFinite(key.classId) && Number.isFinite(key.subjectId);
  const { data, isLoading, isError, error, refetch } = useGetSheetQuery(key, { skip: !valid });
  const sheet = data?.data;
  const status = valid ? parseApiError(error).status : 404;

  return (
    <PageShell className="content-start gap-4 pb-28 md:pb-6" grid>
      {status === 404 || status === 403 ? (
        <OutlinedNotice
          icon={ClipboardList}
          title={status === 404 ? "There is no such sheet" : "This sheet is not yours to open"}
          body={
            status === 404
              ? "The class may be in a branch you do not work in, or it does not take this subject this term."
              : "A sheet opens to its main teacher, its assistants, the class teacher and the head of its department."
          }
          actionLabel="Back to my sheets"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={ClipboardList}
          title="We could not open this sheet"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !sheet ? (
        <SheetSkeleton />
      ) : (
        <SheetBody sheet={sheet} sheetKey={key} onReload={refetch} />
      )}
    </PageShell>
  );
}

function SheetBody({
  sheet,
  sheetKey,
  onReload,
}: {
  sheet: Sheet;
  sheetKey: SheetKey;
  onReload: () => void;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_SHEET);
  const marksHidden = access.isHidden("mark");
  const editable = sheet.can_enter && !access.isReadOnly("mark");
  const showFigures = !access.isHidden("total");
  const reload = useCallback(() => onReload(), [onReload]);
  const saver = useSheetSaver(sheetKey, reload);
  const [confirming, setConfirming] = useState(false);
  const [submit, submitState] = useSubmitSheetMutation();

  const onSubmit = async () => {
    const result = await submit(sheetKey);
    setConfirming(false);
    if ("error" in result || !result.data) return;
    const next = result.data.data.next;
    toast.success(`${sheet.subject.name} submitted`, {
      description:
        next === "MODERATION"
          ? `${sheet.class.name} · it goes to the head of department to moderate.`
          : `${sheet.class.name} · locked for you. The class teacher can now compile the class.`,
    });
  };

  return (
    <>
      {sheet.status === "RETURNED" && sheet.returned && <ReturnedBanner sheet={sheet} />}
      <SheetHeader sheet={sheet} />
      <SubjectTabs sheet={sheet} sheetKey={sheetKey} />

      {marksHidden ? (
        <OutlinedNotice
          icon={EyeOff}
          title="Your role cannot read the marks on this sheet"
          body="An administrator decides which fields each role reads, under Roles & Permissions, Field Access."
        />
      ) : (
        <>
          <SheetToolbar
            sheet={sheet}
            editable={editable}
            showProgress={showFigures}
            saving={saver.saving}
            onSubmit={() => setConfirming(true)}
          />
          <div className="hidden md:block">
            <SheetGrid sheet={sheet} editable={editable} showFigures={showFigures} saver={saver} />
          </div>
          <div className="md:hidden">
            <SheetPhone sheet={sheet} editable={editable} showFigures={showFigures} saver={saver} />
          </div>
          {editable && (
            <p className="text-xs text-gray-06">
              A blank is not a zero: it means nothing has been entered, and a sheet with a blank cannot be
              submitted. Use <strong>ABS</strong> for an unexcused absence, which counts as zero, and{" "}
              <strong>Excused</strong> where the student could not have sat it, which leaves the component out of
              what they could obtain.
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void onSubmit()}
        title={`Submit ${sheet.subject.name}?`}
        body={
          sheet.needs_moderation
            ? "Submitting locks the sheet for you. It goes to the head of the subject's department to moderate."
            : "Submitting locks the sheet for you. The class teacher can then compile the class."
        }
        confirmLabel="Submit sheet"
        busy={submitState.isLoading}
      />
    </>
  );
}

/** Pinned above everything while the sheet is back with its teacher. */
function ReturnedBanner({ sheet }: { sheet: Sheet }) {
  const returned = sheet.returned!;
  return (
    <div role="status" className="rounded-md border border-[#F5C4C4] bg-[#FCEBEB] px-4 py-3">
      <p className="text-sm font-semibold text-[#A32D2D]">
        Returned{returned.by ? ` by ${returned.by}` : ""}
      </p>
      {returned.note && <p className="mt-1 text-sm text-black-01">{returned.note}</p>}
    </div>
  );
}

function SheetHeader({ sheet }: { sheet: Sheet }) {
  const fmt = useSchoolDisplay();
  const paper = examPaperText(fmt, sheet.exam_paper);
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <div className="min-w-0">
        <h1 className="font-mont text-lg font-semibold text-black-01">
          {sheet.subject.name} · {sheet.class.name}
        </h1>
        <p className="text-sm text-gray-06">{sheet.term.name}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fact label="Main teacher" value={sheet.main_teacher?.name ?? "No main teacher"} />
        <Fact
          label="Assistants (read-only)"
          value={sheet.assistants.length ? sheet.assistants.join(", ") : "None"}
        />
        <Fact label="Examination paper" value={paper ?? "Not scheduled"} />
        <div className="min-w-0">
          <dt className="text-xs text-gray-05">Status</dt>
          <dd className="mt-1">
            <SheetStatusChip status={sheet.status} />
          </dd>
        </div>
      </dl>
      {sheet.is_elective && sheet.takers !== null && sheet.roll !== null && (
        <p className="rounded-md bg-[#E6F1FB] px-3 py-2 text-sm text-[#185FA5]">
          {sheet.subject.name} is not a core subject. This sheet lists the {sheet.takers} of {sheet.roll}{" "}
          students recorded as taking it; the rest are on no sheet, no average and no position for it.
        </p>
      )}
    </Panel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-black-01" title={value}>
        {value}
      </dd>
    </div>
  );
}

/**
 * The other subjects of this class the reader teaches, from their own sheets.
 *
 * Built from the reader's own list rather than the class's subjects, so a tab
 * never opens a sheet the reader may not read. A reader with one sheet in the
 * class gets no strip at all.
 */
function SubjectTabs({ sheet, sheetKey }: { sheet: Sheet; sheetKey: SheetKey }) {
  const { data } = useGetMySheetsQuery(sheetKey.term ? { term: sheetKey.term } : undefined);
  const mine = (data?.data.sheets ?? []).filter((s) => s.class.id === sheet.class.id);
  if (mine.length < 2) return null;
  return (
    <nav aria-label="Your subjects in this class" className="max-w-full overflow-x-auto">
      <ul className="flex gap-1 border-b border-border">
        {mine.map((s) => {
          const current = s.subject.id === sheet.subject.id;
          return (
            <li key={s.subject.id}>
              <Link
                to={routesPath.PROTECTED.GRADEBOOK.SHEET_ID(s.class.id, s.subject.id, sheetKey.term)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "-mb-px inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
                  current ? "border-primary text-primary" : "border-transparent text-gray-06 hover:text-black-01",
                )}
              >
                {s.subject.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SheetToolbar({
  sheet,
  editable,
  showProgress,
  saving,
  onSubmit,
}: {
  sheet: Sheet;
  editable: boolean;
  showProgress: boolean;
  saving: boolean;
  onSubmit: () => void;
}) {
  const { formatInstantTime, formatRelativeDay } = useSchoolDisplay();
  const locked = isLockedStatus(sheet.status);
  const blankRows = rowsWithBlanks(sheet.rows, sheet.components);

  let saveState: string;
  if (saving) saveState = "Saving…";
  else if (locked) saveState = "Locked since it was submitted";
  else if (!editable) saveState = "Read only: only the subject's main teacher enters marks";
  else if (sheet.saved_at) {
    const day = formatRelativeDay(sheet.saved_at);
    saveState = `Saved ${day === "Today" ? "" : `${day}, `}${formatInstantTime(sheet.saved_at)}`;
  } else saveState = "Saves as you go";

  const submitLabel =
    blankRows > 0 ? `${blankRows} student${blankRows === 1 ? "" : "s"} still blank` : "Submit sheet";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      {showProgress && sheet.progress && (
        <span className="text-sm font-medium text-black-01">
          {sheet.progress.complete} of {sheet.progress.total} complete
        </span>
      )}
      <span className="text-sm text-gray-06" aria-live="polite">
        {saveState}
      </span>
      {editable && (
        <Button className="ml-auto" onClick={onSubmit} disabled={!sheet.can_submit || saving}>
          {submitLabel}
        </Button>
      )}
    </div>
  );
}

function SheetSkeleton() {
  return (
    <>
      <Skeleton className="h-36 w-full rounded-md" />
      <Skeleton className="h-10 w-80 rounded-md" />
      <Skeleton className="h-96 w-full rounded-md" />
    </>
  );
}
