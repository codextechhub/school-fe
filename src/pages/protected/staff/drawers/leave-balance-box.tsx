import { formatDay } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import { cn } from "@/lib/utils";
import type { StaffLeaveBalance, StaffLeavePreview } from "@/redux/services/staff/staff-types";

import {
  backOn,
  isLimited,
  leaveStanding,
  leftAfterRequest,
  noLimitNote,
  pastAllowanceNote,
  type LeaveStanding,
} from "./leave-copy";

/**
 * Where a person stands on the chosen leave type this session, and what the
 * request being filled in would do to it.
 *
 * Two parts, each drawn only when it has something true to say. The **standing**
 * (allowance, taken, pending, remaining) comes from the person's balance row,
 * or from the preview where that carries every figure. The **request** (days
 * requested, left after this, the return date) comes from the server's preview,
 * because only the server knows the school's working days and its calendar
 * closures at that person's branch.
 *
 * **Absent is not zero.** Field Access removes what a role may not read from
 * the payload (the `balance`, `days` and `dates` switches each cover their own
 * keys, and hiding the type removes the balances and the preview's standing
 * too), and the box then leaves that line out entirely: a missing balance is
 * never drawn as 0 days left. It goes by what the server sent and not by the
 * role's map, because a person always reads their own leave in full. With
 * nothing to show the box is not drawn.
 *
 * Going past the allowance is stated and never blocked: the approver decides.
 */
export function LeaveBalanceBox({
  typeLabel,
  row,
  sessionName,
  preview,
  counting,
}: {
  typeLabel: string;
  /** The person's balance row for the chosen type, when the payload carries one. */
  row: StaffLeaveBalance | undefined;
  /** The academic session the balances count against, when known. */
  sessionName: string | undefined;
  /** The server's answer for the chosen dates, once it has one. */
  preview: StaffLeavePreview | undefined;
  /** The dates are chosen and the server has not answered yet. */
  counting: boolean;
}) {
  const standing = leaveStanding(row, preview);
  const session = sessionName ?? preview?.session?.name ?? "this session";

  const days = preview?.days;
  const back = preview?.resumption_date;
  const after = preview ? leftAfterRequest(preview) : null;
  const requestShown = days != null || Boolean(back) || after != null;

  if (!standing && !requestShown && !counting) return null;

  return (
    <section
      aria-label="Leave balance"
      aria-live="polite"
      className="grid gap-3 rounded-lg bg-white-03 px-3.5 py-3 text-gray-01"
    >
      {standing && <Standing standing={standing} title={`${row?.label ?? typeLabel} leave, ${session}`} session={session} />}

      {(requestShown || counting) && (
        <div className={cn("grid gap-1.5", standing && "border-t border-white-02 pt-3")}>
          {requestShown ? (
            <>
              {days != null && (
                <Line label="Days requested" value={String(days)} large />
              )}
              {after && !after.over && <Line label="Left after this" value={after.text} />}
              {after?.over && (
                <p className="text-[13px] font-medium text-amber-800">
                  {after.text}. It can still be filed; the approver decides.
                </p>
              )}
              {back && (
                <p className="text-[13px]">
                  {backOn(formatDay(back, activeDisplayPrefs(), { weekday: "long" }))}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-05">Counting...</p>
          )}
        </div>
      )}
    </section>
  );
}

function Standing({ standing, title, session }: { standing: LeaveStanding; title: string; session: string }) {
  const past = pastAllowanceNote(standing);
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium text-gray-05">{title}</p>
      {isLimited(standing) ? (
        <dl className="grid grid-cols-4 gap-2">
          <Figure label="Allowance" value={standing.allowance} />
          <Figure label="Taken" value={standing.taken} />
          <Figure label="Pending" value={standing.pending} />
          <Figure label="Remaining" value={Math.max(0, standing.remaining)} over={standing.remaining < 0} />
        </dl>
      ) : (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-lg font-semibold text-black-01">No limit</span>
          <span className="text-[13px]">{noLimitNote(standing, session)}</span>
        </p>
      )}
      {past && <p className="text-[13px] font-medium text-amber-800">{past}</p>}
    </div>
  );
}

function Figure({ label, value, over }: { label: string; value: number; over?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-gray-05">{label}</dt>
      <dd className={cn("text-lg font-semibold leading-tight", over ? "text-amber-800" : "text-black-01")}>{value}</dd>
    </div>
  );
}

function Line({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <dl className="flex items-baseline justify-between gap-3">
      <dt className="text-[13px]">{label}</dt>
      <dd className={cn("font-semibold text-black-01", large ? "text-2xl leading-tight" : "text-sm")}>{value}</dd>
    </dl>
  );
}
