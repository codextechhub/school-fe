import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Info } from "lucide-react";

import { NativeSelect } from "@/components/ui/native-select";
import { apiErrorMessage, fieldErrors } from "@/utils/api-error";
import {
  useChangeStaffStatusMutation,
  useGetStaffStatusOptionsQuery,
} from "@/redux/services/staff/staff-api";
import type { EmploymentStatus } from "@/redux/services/staff/staff-types";

import {
  DrawerShell,
  Field,
  inputClass,
} from "../../students/drawers/drawer-shell";
import { AccountBadge, EmploymentBadge } from "../badges";

/** Moves a school is asked to account for later, and drawn accordingly. */
const HEAVY: EmploymentStatus[] = ["SUSPENDED", "TERMINATED"];

/** Today as the reader's calendar has it, not as UTC has it. */
function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

const today = localToday();

/**
 * Move somebody through the employment lifecycle.
 *
 * **The moves come from the server, not from a table written here.** `INVITED`
 * offers none at all, because an invited person leaves that state by using
 * their own link and setting a password: an administrator doing it for them
 * would move the record to Active while the account stayed Pending, leaving
 * somebody who reads Active on every screen in the school and cannot sign in.
 * A transition table on this side would have to know that, and would be the
 * second place the rule lived.
 *
 * **Every move states in words what it does to the login, before it is made.**
 * That sentence is the server's, because the mapping between an employment
 * transition and an account action is the server's. One of them is worth
 * knowing about here: resigning does NOT close the account on the last working
 * day. Nothing in the platform runs on a schedule, so Mr. Ayanwale's last day
 * is 18 December and on the 19th he can still sign in. The wording says an
 * administrator closes it, because that is what happens.
 *
 * **The classes that need cover are named, never counted.** "3 classes need
 * cover" sends a head teacher hunting through a roster of a hundred and nine.
 */
export function StatusDrawer({
  staffId,
  onClose,
}: {
  staffId: number;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetStaffStatusOptionsQuery(staffId);
  const [change, { isLoading: saving }] = useChangeStaffStatusMutation();

  const [next, setNext] = useState<EmploymentStatus | "">("");
  // Defaults to today, computed once at mount rather than in an effect. Read in
  // the reader's own zone: `toISOString` answers in UTC and would put a
  // west-of-Greenwich school a day behind on the date it is defaulting to.
  const [effective, setEffective] = useState(today);
  const [lastDay, setLastDay] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const state = data?.data;
  const options = useMemo(() => state?.options ?? [], [state]);
  const chosen = options.find((option) => option.value === next);

  const canSave =
    Boolean(next) &&
    Boolean(effective) &&
    (!chosen?.reason_required || reason.trim().length > 0) &&
    (!chosen?.last_working_day_required || Boolean(lastDay));

  async function save() {
    if (!chosen) return;
    try {
      await change({
        id: staffId,
        body: {
          to_status: chosen.value,
          effective_date: effective,
          reason: reason.trim() || undefined,
          last_working_day: chosen.last_working_day_required
            ? lastDay
            : undefined,
          note: note.trim() || undefined,
        },
      }).unwrap();
      toast.success(chosen.account_effect);
      onClose();
    } catch (error) {
      const perField = fieldErrors(error);
      if (Object.keys(perField).length) {
        setErrors(perField);
        return;
      }
      toast.error(
        apiErrorMessage(error, "We could not change that status. Try again."),
      );
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Change employment status"
      subtitle="What this does to their account is spelled out before you confirm."
      saveLabel={chosen ? `Move to ${chosen.label}` : "Change status"}
      onSave={() => void save()}
      canSave={canSave}
      saving={saving}
      destructive={Boolean(next) && HEAVY.includes(next as EmploymentStatus)}
    >
      {isLoading || !state ? (
        <p className="text-[13px] text-gray-05">Loading…</p>
      ) : (
        <div className="grid gap-4">
          {/* The two facts as they stand, side by side. A reader about to move
              somebody should see both, because one of the moves changes the
              second and three of them do not. */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-04 px-3.5 py-3">
            <div>
              <p className="text-xs text-gray-05">Employment now</p>
              <span className="mt-1 inline-flex">
                <EmploymentBadge status={state.employment_status} />
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-05">Account now</p>
              <span className="mt-1 inline-flex">
                <AccountBadge status={state.account_status} />
              </span>
            </div>
          </div>

          {options.length === 0 ? (
            <p className="rounded-lg bg-white-03 px-3.5 py-3 text-[13px] text-gray-01">
              {/* The server's own sentence where it has one: an empty list has
                  more than one reason, and only the server knows which. */}
              {state.note ??
                "There is no move to make from here. Somebody who has been invited becomes Active by opening their own link and setting a password, and a record that has been closed stays closed."}
            </p>
          ) : (
            <>
              <Field label="Move to" required error={errors.to_status}>
                <NativeSelect
                  aria-label="Move to"
                  value={next}
                  onChange={(e) =>
                    setNext(e.target.value as EmploymentStatus | "")
                  }
                  className="h-9"
                >
                  <option value="">Choose a status</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              {chosen && (
                <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
                  <Info className="mt-px size-3.5 shrink-0 text-primary" />
                  {chosen.account_effect}
                </p>
              )}

              <Field label="Effective date" required error={errors.effective_date}>
                <input
                  type="date"
                  value={effective}
                  onChange={(e) => setEffective(e.target.value)}
                  className={inputClass}
                />
              </Field>

              {chosen?.last_working_day_required && (
                <Field
                  label="Last working day"
                  required
                  error={errors.last_working_day}
                  hint="Their account stays open until an administrator closes it. Nothing closes it on this date."
                >
                  <input
                    type="date"
                    value={lastDay}
                    onChange={(e) => setLastDay(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}

              <Field
                label="Reason"
                required={chosen?.reason_required}
                error={errors.reason}
              >
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why this is happening"
                  className={inputClass}
                />
              </Field>

              <Field label="Notes" error={errors.note}>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>

              {state.assignments_needing_cover.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3">
                  <p className="flex items-center gap-2 text-xs font-medium text-amber-900">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    These classes will need cover
                  </p>
                  <ul className="mt-1.5 grid gap-0.5 text-xs text-amber-900">
                    {state.assignments_needing_cover.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-xs text-amber-900/80">
                    Moving them does not cancel these assignments.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </DrawerShell>
  );
}
