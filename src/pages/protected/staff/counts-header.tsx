import { GraduationCap, Lock } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  EmploymentStatus,
  StaffCounts,
} from "@/redux/services/staff/staff-types";

/**
 * The directory's header: who works here, and the two figures that are not
 * about that.
 *
 * **Six numbers, and they are not all the same kind of thing**, which is why
 * each is labelled rather than pooled into one strip of tiles. Total and
 * currently employed differ the moment somebody resigns. The employment
 * breakdown draws the bar. Teaching duties is a count of assignments, with
 * nothing to compare it against. And **locked accounts is an ACCOUNT count
 * sitting beside employment ones**, which is why it is separated by a rule and
 * says so in words: a school that reads a security lockout as a suspension
 * believes its teacher was disciplined for mistyping a password.
 *
 * **The side panel switches dimension rather than padding one.** At a school
 * with several branches it is the posting breakdown; at a school with one it
 * would repeat a single value on every row, so the dimension recedes and the
 * role distribution takes the space. The server decides which and says so in
 * `breakdown_by`; nothing here guesses from the branch list.
 */

const SEGMENT: Record<EmploymentStatus, string> = {
  ACTIVE: "bg-green-700",
  INVITED: "bg-amber-500",
  ON_LEAVE: "bg-amber-400",
  SUSPENDED: "bg-red-500",
  RESIGNED: "bg-gray-02",
  TERMINATED: "bg-gray-03",
};

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-gray-05">
      {children}
    </p>
  );
}

export function CountsHeader({
  counts,
  loading,
  onPickStatus,
  onPickLocked,
  onPickTeaching,
}: {
  counts?: StaffCounts;
  loading?: boolean;
  onPickStatus: (status: EmploymentStatus) => void;
  onPickLocked: () => void;
  onPickTeaching: () => void;
}) {
  const present = (counts?.by_employment_status ?? []).filter((r) => r.count > 0);
  // Never zero: a bar divided by nothing is a row of NaN-wide segments.
  const total = Math.max(1, counts?.total ?? 0);
  const sideTitle =
    counts?.breakdown_by === "role" ? "By role" : "Posted to";

  return (
    <Panel as="section" className="min-w-0 px-6 py-5.5">
      <div className="flex flex-wrap items-start gap-8">
        {/* ── Who works here, and how it splits ───────────────────────────── */}
        <div className="min-w-0 flex-[1_1_300px]">
          <ColumnLabel>Staff records</ColumnLabel>
          {loading ? (
            <Skeleton className="mt-2 h-10 w-24" />
          ) : (
            <p className="mt-2 text-[40px] font-semibold leading-none text-black-01">
              {counts?.total ?? 0}
            </p>
          )}
          <p className="mt-1.5 text-[13px] text-gray-05">
            {counts?.currently_employed ?? 0} currently employed
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-04">
              {present.map((row) => (
                <button
                  key={row.value}
                  type="button"
                  title={`${row.label}: ${row.count}`}
                  aria-label={`Filter to ${row.label}`}
                  onClick={() => onPickStatus(row.value)}
                  className={cn("h-2.5", SEGMENT[row.value] ?? "bg-gray-02")}
                  style={{ width: `${(row.count / total) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {present.map((row) => (
                <button
                  key={row.value}
                  type="button"
                  onClick={() => onPickStatus(row.value)}
                  aria-label={`Filter to ${row.label}`}
                  className="inline-flex items-center gap-[7px] hover:opacity-70"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      SEGMENT[row.value] ?? "bg-gray-02",
                    )}
                  />
                  <span className="text-[13px] text-gray-01">{row.label}</span>
                  <span className="text-[13px] font-semibold text-black-01">
                    {row.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* The two figures that are not an employment status. Separated by a
              rule, because that is the whole point of them being here. */}
          <div className="mt-5 flex flex-wrap gap-2.5 border-t border-white-02 pt-4">
            <QuickFigure
              icon={GraduationCap}
              count={counts?.with_teaching_duties ?? 0}
              label="with teaching duties"
              onClick={onPickTeaching}
            />
            {(counts?.locked_accounts ?? 0) > 0 && (
              <QuickFigure
                icon={Lock}
                count={counts?.locked_accounts ?? 0}
                // Named as an account fact on the chip itself, not only in a
                // tooltip. This is the figure most likely to be read as an
                // employment state, and it is not one.
                label="locked out of their account"
                tone="alert"
                onClick={onPickLocked}
              />
            )}
          </div>
        </div>

        {/* ── The side breakdown, whichever dimension applies ─────────────── */}
        <div className="min-w-55 flex-[1_1_220px]">
          <ColumnLabel>{sideTitle}</ColumnLabel>
          {loading ? (
            <div className="mt-3 grid gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {(counts?.breakdown ?? []).map((row) => (
                <li
                  key={`${row.value ?? "none"}-${row.label}`}
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 truncate text-gray-01">
                    {row.label}
                  </span>
                  <span className="font-semibold text-black-01">
                    {row.count}
                  </span>
                </li>
              ))}
              {!(counts?.breakdown ?? []).length && (
                <li className="text-[13px] text-gray-05">Nothing to show yet.</li>
              )}
            </ul>
          )}
          <p className="mt-3 text-xs text-gray-05">
            {counts?.breakdown_by === "role"
              ? "Roles people hold. Somebody with none is counted under No role."
              : "Where each person is based. Somebody with no single base is School-wide, and appears on every branch's roster."}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function QuickFigure({
  icon: Icon,
  count,
  label,
  tone = "plain",
  onClick,
}: {
  icon: typeof Lock;
  count: number;
  label: string;
  tone?: "plain" | "alert";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px]",
        tone === "alert"
          ? "bg-destructive/10 text-error-text hover:bg-destructive/15"
          : "bg-gray-04 text-gray-01 hover:bg-white-02",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="font-semibold">{count}</span>
      {label}
    </button>
  );
}
