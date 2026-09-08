import { CalendarPlus, FileText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  StaffDocument,
  StaffGrant,
  StaffHistoryEntry,
  StaffLeave,
  StaffLeaveRequest,
  StaffQualification,
  StaffRevokedGrant,
  StaffRoles,
  StaffTeaching,
} from "@/redux/services/staff/staff-types";
// Not student-specific, and a second copy is the thing to avoid: a date parsed
// two ways is a birthday that reads a day early on one screen and not the
// other. If a third module needs them they move somewhere shared.
import { formatDate, formatDateTime } from "../../students/format";

/**
 * The profile's tab bodies, each with the empty state it is most often in.
 *
 * Every one of these is empty for most people at most schools - nobody has
 * uploaded a certificate, nobody has filed leave - so the empty state is the
 * common case rather than the edge, and each says what would put something
 * there rather than only that there is nothing.
 *
 * **Nothing here claims a check the platform cannot make.** No verified badge
 * on a qualification, no expiry on a document, no leave balance, and no
 * coloured workload. Nothing anywhere verifies a degree, no register exists to
 * verify one against, and no entitlement is recorded to count leave against -
 * so a badge or a balance would be a number a school would believe.
 */

export function TabSkeleton() {
  return (
    <div className="grid gap-2.5">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-[13px] text-gray-05">{children}</p>
  );
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs text-gray-05">{children}</p>;
}

// ── Roles and reach ────────────────────────────────────────────────────────

/**
 * What this person may do, and where it reaches.
 *
 * **Reach is derived from grants and is not the posting.** Somebody based at
 * Lekki whose Teacher grant is pinned to Ikeja as well reaches both, and an
 * empty branch list where they hold only withdrawn branch grants is a real
 * answer meaning they reach the school-wide rows and nothing else. The server
 * says which in `reach.note`, and it is rendered rather than reworded.
 *
 * **Revoked grants are history and are never hidden.** "What could this person
 * do before" is the question asked after something has gone wrong.
 *
 * `overrides` is absent entirely, not empty, for a reader without
 * `school.user_overrides.view` - an empty block would answer the question the
 * restriction exists to withhold - so this renders the section only when the
 * server sent one.
 *
 * **Changing a grant happens here, not only from the directory.** This tab is
 * where somebody comes to ask what a person may do, and it is the same visit
 * they answer it in: reading that Mrs. Okafor holds nothing and having to go
 * back to the list to give her something is the long way round a question she
 * is already open on. The button opens the same drawer the directory's row menu
 * opens, so a grant made from either place is one act with one confirmation,
 * and it carries the same key the server checks rather than a looser one.
 */
export function AccessTab({
  roles,
  staffId,
  onOpenDrawer,
}: {
  roles: StaffRoles;
  staffId: number;
  onOpenDrawer: (request: { kind: "role"; staffId: number }) => void;
}) {
  const openRoles = () => onOpenDrawer({ kind: "role", staffId });

  return (
    <div className="grid gap-6">
      <section>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-black-01">Roles held</h3>
          <PermissionGate permission={P.ASSIGN_ROLE}>
            <Button size="sm" variant="outline" onClick={openRoles}>
              Grant or withdraw
            </Button>
          </PermissionGate>
        </div>
        <SectionNote>
          What a role can do is defined in access control, not here.
        </SectionNote>
        {roles.roles.length ? (
          <ul className="grid gap-2.5">
            {roles.roles.map((grant) => (
              <GrantRow key={grant.id} grant={grant} />
            ))}
          </ul>
        ) : (
          <Empty>
            No role granted yet, so they can sign in and reach nothing.
          </Empty>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold text-black-01">
          Branches they reach
        </h3>
        <SectionNote>{roles.reach.note}</SectionNote>
        {roles.reach.school_wide ? (
          <p className="text-sm text-black-01">Every branch.</p>
        ) : roles.reach.branches.length ? (
          <ul className="grid gap-2">
            {roles.reach.branches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm text-black-01">{b.name}</span>
                <span className="text-xs text-gray-05">through {b.via}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            No branch narrowing, so they reach the school-wide records and
            nothing pinned to a branch.
          </Empty>
        )}
      </section>

      {roles.revoked.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-black-01">
            Withdrawn grants
          </h3>
          <SectionNote>
            Kept rather than deleted, with who withdrew it and why.
          </SectionNote>
          <ul className="grid gap-2.5">
            {roles.revoked.map((grant) => (
              <RevokedRow key={grant.id} grant={grant} />
            ))}
          </ul>
        </section>
      )}

      {roles.overrides && roles.overrides.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-black-01">
            Exceptions on this account
          </h3>
          <SectionNote>
            Permissions allowed or denied for this person alone, on top of what
            their roles give them.
          </SectionNote>
          <ul className="grid gap-2.5">
            {roles.overrides.map((row) => (
              <li
                key={`${row.permission}-${row.mode}`}
                className="rounded-lg border border-white-02 px-3.5 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      row.mode === "ALLOW"
                        ? "bg-green-01/10 text-green-01-text"
                        : "bg-destructive/10 text-error-text",
                    )}
                  >
                    {row.mode === "ALLOW" ? "Allowed" : "Denied"}
                  </span>
                  <span className="font-mono text-xs text-gray-01">
                    {row.permission}
                  </span>
                </div>
                {row.reason && (
                  <p className="mt-1.5 text-xs text-gray-05">{row.reason}</p>
                )}
                {row.expires_at && (
                  <p className="mt-1 text-xs text-gray-05">
                    Expires {formatDate(row.expires_at)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GrantRow({ grant }: { grant: StaffGrant }) {
  return (
    <li className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5">
      <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="text-sm font-medium text-black-01">{grant.role}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px]",
          grant.school_wide
            ? "bg-white-03 text-primary"
            : "bg-gray-04 text-gray-01",
        )}
      >
        {grant.branch_name}
      </span>
      <span className="ml-auto text-xs text-gray-05">
        Granted {formatDate(grant.granted_at)}
        {grant.granted_by ? ` by ${grant.granted_by.name}` : ""}
      </span>
    </li>
  );
}

function RevokedRow({ grant }: { grant: StaffRevokedGrant }) {
  return (
    <li className="rounded-lg border border-white-02 bg-gray-04/40 px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm text-gray-01 line-through">{grant.role}</span>
        <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[11px] text-gray-05">
          {grant.branch_name}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-05">
        Withdrawn {formatDate(grant.revoked_at)}
        {grant.revoked_by ? ` by ${grant.revoked_by.name}` : ""}
        {grant.reason ? ` - ${grant.reason}` : ""}
      </p>
    </li>
  );
}

// ── Teaching duties ────────────────────────────────────────────────────────

/**
 * What this person teaches this session, and nothing about when or where.
 *
 * An assignment says WHAT; the timetable says when and in which room. The load
 * is a count of assignments and is deliberately uncoloured: no contract records
 * a maximum and no subject records a weekly frequency, so a threshold here
 * would be a judgement nothing in the platform can make.
 */
export function TeachingTab({ teaching }: { teaching: StaffTeaching }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold text-black-01">
        {teaching.session.name}
      </h3>
      <SectionNote>{teaching.load_note}</SectionNote>
      {teaching.assignments.length ? (
        <ul className="grid gap-2.5">
          {teaching.assignments.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5"
            >
              <span className="text-sm font-medium text-black-01">
                {row.subject_name}
              </span>
              <span className="text-sm text-gray-01">{row.class_name}</span>
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
                  row.part === "LEAD"
                    ? "bg-[#DBE0EB] text-[#4A659D]"
                    : "bg-gray-04 text-gray-05",
                )}
              >
                {row.part_label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing assigned this session.</Empty>
      )}
    </section>
  );
}

// ── Qualifications and documents ───────────────────────────────────────────

export function QualificationsTab({ rows }: { rows: StaffQualification[] }) {
  return (
    <section>
      <SectionNote>
        Typed rows, as the school recorded them. Nothing in the platform checks
        a qualification, so nothing here says one was checked.
      </SectionNote>
      {rows.length ? (
        <ul className="grid gap-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white-02 px-3.5 py-2.5"
            >
              <p className="text-sm font-medium text-black-01">
                {row.qualification}
              </p>
              <p className="mt-0.5 text-xs text-gray-05">
                {[row.institution, row.year_obtained]
                  .filter(Boolean)
                  .join(" · ") || "No institution recorded"}
              </p>
              {row.note && (
                <p className="mt-1 text-xs text-gray-01">{row.note}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>None recorded.</Empty>
      )}
    </section>
  );
}

export function DocumentsTab({ rows }: { rows: StaffDocument[] }) {
  return (
    <section>
      <SectionNote>
        Files held against this person. There is no expiry and no approval
        state: nothing checks either, and a field somebody sets by hand reads as
        a check that was made.
      </SectionNote>
      {rows.length ? (
        <ul className="grid gap-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5"
            >
              <FileText className="size-4 shrink-0 text-gray-05" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm text-black-01">
                  {row.title || row.document_type_label}
                </span>
                <span className="block text-xs text-gray-05">
                  {row.document_type_label} · added {formatDate(row.created_at)}
                  {row.uploaded_by ? ` by ${row.uploaded_by.name}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing uploaded.</Empty>
      )}
    </section>
  );
}

// ── Leave ──────────────────────────────────────────────────────────────────

/**
 * How a request reads, and what it looks like.
 *
 * Keyed on the CODE the server sends. `display_status` is derived rather than
 * looked up, so nothing behind it produces a label and the wording is this
 * screen's - which also means a value added later falls through to the neutral
 * default and prints its own code rather than nothing.
 *
 * Completed is grey and not green: an approved absence that has finished is
 * history, and colouring it like a live approval puts weight on the one row
 * nobody needs to act on.
 */
const LEAVE_STATUS: Record<
  StaffLeaveRequest["display_status"],
  { label: string; tone: string }
> = {
  APPROVED: { label: "Approved", tone: "bg-green-01/10 text-green-01-text" },
  PENDING: { label: "Pending", tone: "bg-yellow-01/10 text-yellow-01-text" },
  REJECTED: { label: "Rejected", tone: "bg-destructive/10 text-error-text" },
  CANCELLED: { label: "Cancelled", tone: "bg-gray-05/10 text-gray-06-text" },
  COMPLETED: { label: "Completed", tone: "bg-gray-05/10 text-gray-06-text" },
};

/**
 * The days-taken chips carry a type CODE, not a label.
 *
 * The request rows get `leave_type_label` from the server, but the days-taken
 * summary is an aggregate and carries only the code - so the wording lives here
 * for that one place rather than being derived by lowercasing, which turns
 * COMPASSIONATE into "Compassionate" correctly and would turn a two-word value
 * added later into nonsense.
 */
const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  STUDY: "Study",
  COMPASSIONATE: "Compassionate",
  OTHER: "Other",
};

/**
 * Absences filed for this person, and how many days have been taken.
 *
 * **Days taken is not a balance and the screen says so, in the server's own
 * words.** A balance is an entitlement minus what has been used, and nothing
 * anywhere records an entitlement: Nigerian statutory leave is a floor rather
 * than a schedule, and schools vary it by grade and by length of service. A
 * number here that looked like a balance is one a school would believe.
 */
export function LeaveTab({
  leave,
  onFile,
  fileLabel,
}: {
  leave: StaffLeave;
  /** Absent for a reader who may neither apply nor file on somebody's behalf. */
  onFile?: () => void;
  fileLabel?: string;
}) {
  return (
    <div className="grid gap-5">
      {onFile && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onFile}>
            <CalendarPlus className="size-4" />
            {fileLabel}
          </Button>
        </div>
      )}
      <section>
        <h3 className="mb-1 text-sm font-semibold text-black-01">Days taken</h3>
        <SectionNote>{leave.balance_note}</SectionNote>
        {leave.days_taken.length ? (
          <div className="flex flex-wrap gap-2">
            {leave.days_taken.map((row) => (
              <span
                key={row.leave_type}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-04 px-2.5 py-1 text-[13px] text-gray-01"
              >
                <span className="font-semibold text-black-01">{row.days}</span>
                {LEAVE_TYPE_LABEL[row.leave_type] ?? row.leave_type}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-gray-05">None taken.</p>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-black-01">Requests</h3>
        {leave.leave.length ? (
          <ul className="grid gap-2.5">
            {leave.leave.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white-02 px-3.5 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-medium text-black-01">
                    {row.leave_type_label}
                  </span>
                  <span className="text-xs text-gray-05">
                    {formatDate(row.start_date)} to {formatDate(row.end_date)} ·{" "}
                    {row.days} {row.days === 1 ? "day" : "days"}
                  </span>
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
                      LEAVE_STATUS[row.display_status]?.tone ??
                        "bg-gray-05/10 text-gray-06-text",
                    )}
                  >
                    {LEAVE_STATUS[row.display_status]?.label ??
                      row.display_status}
                  </span>
                </div>
                {row.note && (
                  <p className="mt-1.5 text-xs text-gray-01">{row.note}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No leave recorded.</Empty>
        )}
      </section>
    </div>
  );
}

// ── History ────────────────────────────────────────────────────────────────

/**
 * One timeline, two halves, told apart on sight.
 *
 * An employment event and an account event are drawn differently on purpose. A
 * lockout is the identity layer noticing three bad passwords; a suspension is a
 * school taking a decision about somebody's job. A school that reads one as the
 * other believes its teacher was disciplined for mistyping her password, so the
 * kind is a coloured rail down the left rather than a word somebody has to
 * notice.
 */
export function HistoryTab({ entries }: { entries: StaffHistoryEntry[] }) {
  if (!entries.length) return <Empty>Nothing recorded yet.</Empty>;

  return (
    <ol className="grid gap-3">
      {entries.map((entry, index) => (
        <li
          key={`${entry.kind}-${entry.at}-${index}`}
          className={cn(
            "border-l-2 pl-3.5",
            entry.kind === "employment" ? "border-primary" : "border-gray-02",
          )}
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm text-black-01">
              {entry.kind === "employment"
                ? entry.from_status_label
                  ? `${entry.from_status_label} to ${entry.to_status_label}`
                  : entry.to_status_label
                : entry.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                entry.kind === "employment"
                  ? "bg-white-03 text-primary"
                  : "bg-gray-04 text-gray-05",
              )}
            >
              {entry.kind === "employment" ? "Employment" : "Account"}
            </span>
          </div>
          {entry.kind === "employment" && entry.reason && (
            <p className="mt-0.5 text-xs text-gray-01">{entry.reason}</p>
          )}
          <p className="mt-0.5 text-xs text-gray-05">
            {formatDateTime(entry.at)}
            {entry.kind === "employment"
              ? entry.changed_by
                ? ` · ${entry.changed_by.name}`
                : ""
              : entry.actor
                ? ` · ${entry.actor.name}`
                : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
