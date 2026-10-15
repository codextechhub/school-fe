import { useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, CheckCheck, ClipboardCheck, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/custom/surface";
import { useFieldAccess } from "@/components/finance-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useFillPresentMutation,
  useGetRegisterQuery,
  useSetMarkMutation,
  useSubmitRegisterMutation,
} from "@/redux/services/attendance/attendance-api";
import type { AttendanceMark, RegisterRow } from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";

import { MARKS } from "../marks";
import { MarkDrawers, type MarkDrawer } from "../register/mark-drawers";
import { RegisterRowItem, type RowMode } from "../register/register-rows";
import { submitConfirmText, submittedText } from "../register/submit-text";
import { focusedRegisterFieldPolicy } from "./focused-register-policy";

/**
 * A class register kept beside the administrator's daily work queue.
 *
 * The panel reuses the complete register response and the same row controls as
 * the dedicated register page. Field Access therefore removes or disables the
 * same fields in both places, and every write updates the shared RTK Query
 * cache rather than maintaining a second copy of the register.
 */
export function FocusedRegister({
  classId,
  date,
  isToday,
}: {
  classId: number;
  date: string;
  isToday: boolean;
}) {
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const { data, isLoading, isError, refetch } = useGetRegisterQuery({ classId, date });
  const register = data?.data;
  const [drawer, setDrawer] = useState<MarkDrawer | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [setMark, markState] = useSetMarkMutation();
  const [fillPresent, fillState] = useFillPresentMutation();
  const [submit, submitState] = useSubmitRegisterMutation();

  if (isError) {
    return (
      <Panel as="section" className="grid min-h-64 place-items-center p-6 text-center xl:sticky xl:top-4">
        <div className="max-w-xs space-y-3">
          <ClipboardCheck className="mx-auto size-7 text-gray-05" aria-hidden="true" />
          <div>
            <h2 className="font-mont text-sm font-semibold text-black-01">This register did not load</h2>
            <p className="mt-1 text-xs text-gray-06">Try again, or open the full register page.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </Panel>
    );
  }

  if (isLoading || !register) {
    return (
      <Panel as="section" className="overflow-hidden xl:sticky xl:top-4">
        <div className="space-y-3 bg-primary px-4 py-5">
          <Skeleton className="h-5 w-48 bg-white/30" />
          <Skeleton className="h-2 w-full bg-white/30" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </Panel>
    );
  }

  const key = { classId, date };
  const submitted = register.status === "SUBMITTED";
  const windowShut = submitted && register.edit_window_open === false;
  const fieldPolicy = focusedRegisterFieldPolicy({
    markHidden: access.isHidden("mark"),
    markReadOnly: access.isReadOnly("mark"),
    arrivedAtHidden: access.isHidden("arrived_at"),
    arrivedAtReadOnly: access.isReadOnly("arrived_at"),
    reasonCodeHidden: access.isHidden("reason_code"),
    reasonCodeReadOnly: access.isReadOnly("reason_code"),
    countsHidden: access.isHidden("counts"),
    statusHidden: access.isHidden("status"),
  });
  const showMark = !access.isHidden("mark");
  const mayTake = hasPermission(P.TAKE_ANY_REGISTER);
  const mode: RowMode = !register.closed && mayTake && fieldPolicy.canMark && !windowShut ? "mark" : "read";
  const marks: AttendanceMark[] = fieldPolicy.marks;
  const unmarked = register.counts?.unmarked
    ?? register.rows.filter((row) => !row.locked && !row.mark).length;
  const markable = register.rows.filter((row) => !row.locked).length;
  const marked = Math.max(0, markable - unmarked);
  const showCounts = fieldPolicy.showCounts;
  const progress = markable > 0 ? Math.round((marked / markable) * 100) : 0;

  const onMark = (row: RegisterRow, mark: AttendanceMark) => {
    if (mark === "L") return setDrawer({ kind: "late", row });
    if (mark === "E") return setDrawer({ kind: "excused", row });
    if (row.mark === mark) return;
    void setMark({ ...key, studentId: row.student_id, body: { mark } });
  };

  const onFill = async () => {
    const result = await fillPresent(key);
    if ("error" in result || !result.data) return;
    const filled = result.data.data.filled;
    toast.success(filled ? `${filled} marked Present` : "Nothing left to fill");
  };

  const onSubmit = async () => {
    const preview = register.submit_preview;
    const result = await submit(key);
    setConfirming(false);
    if ("error" in result) return;
    toast.success(`${register.school_class.name} register submitted`, {
      description: submittedText(preview),
    });
  };

  return (
    <>
      <Panel
        as="section"
        id="attendance-focused-register"
        className="overflow-hidden border-primary/30 shadow-[0_18px_45px_-30px_rgba(37,99,235,0.65)] xl:sticky xl:top-4"
      >
        <div className="bg-gradient-to-br from-primary to-indigo-600 px-4 py-4 text-white sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-mont text-base font-semibold">
                {register.school_class.name} daily register
              </h2>
              <p className="mt-1 text-xs text-white/75">
                {register.date_label}
                {showCounts && register.counts ? ` · ${register.counts.total} students` : ""}
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-white hover:bg-white/15 hover:text-white"
            >
              <Link
                to={routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(classId, isToday ? undefined : date)}
                aria-label={`Open the full ${register.school_class.name} register`}
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
          {showCounts && (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25">
                <span className="block h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-semibold">{marked} / {markable}</span>
            </div>
          )}
        </div>

        {register.closed ? (
          <div className="p-5 text-sm text-gray-06">No register is taken on this closed day.</div>
        ) : register.roster_empty ? (
          <div className="p-5 text-sm text-gray-06">No student is placed in this class on this day.</div>
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-border bg-white-05 px-3 py-2.5">
              {mode === "mark" && unmarked > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  onClick={() => void onFill()}
                  disabled={fillState.isLoading}
                >
                  {fillState.isLoading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCheck className="size-4" />
                  )}
                  Everyone else present
                </Button>
              )}
              {showMark && (
                <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-gray-05">
                  {marks.map((mark) => (
                    <span key={mark} className="whitespace-nowrap">
                      <strong className="text-black-01">{mark}</strong> {MARKS[mark].label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <ul className="max-h-[34rem] divide-y divide-border overflow-y-auto overscroll-contain">
              {register.rows.map((row) => (
                <RegisterRowItem
                  key={row.student_id}
                  row={row}
                  mode={mode}
                  marks={marks}
                  busy={markState.isLoading && markState.originalArgs?.studentId === row.student_id}
                  onMark={(mark) => onMark(row, mark)}
                />
              ))}
            </ul>

            <div className="flex min-w-0 flex-wrap items-center gap-3 border-t border-border bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                {showCounts && (
                  <p className="text-xs font-medium text-black-01">
                    {unmarked > 0
                      ? `${unmarked} student${unmarked === 1 ? " is" : "s are"} not marked`
                      : "Every student is marked"}
                  </p>
                )}
                {fieldPolicy.showStatus && register.status && (
                  <Badge variant={submitted ? "active" : "pending"} className="mt-1 rounded-full">
                    {submitted ? "Submitted" : "Draft saves automatically"}
                  </Badge>
                )}
              </div>
              {mode === "mark" && !submitted && (
                <Button
                  size="sm"
                  disabled={unmarked > 0 || submitState.isLoading}
                  onClick={() => setConfirming(true)}
                >
                  Submit register
                </Button>
              )}
            </div>
          </>
        )}
      </Panel>

      <MarkDrawers
        drawer={drawer}
        register={key}
        dateLabel={register.date_label}
        onClose={() => setDrawer(null)}
      />
      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void onSubmit()}
        title="Submit this register?"
        body={submitConfirmText(register.submit_preview)}
        confirmLabel="Submit register"
        busy={submitState.isLoading}
      />
    </>
  );
}
