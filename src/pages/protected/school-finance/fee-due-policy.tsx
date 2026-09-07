/**
 * When this school's fee bills fall due.
 *
 * Schools do not think in payment terms. A supplier invoice is due "30 days
 * net" because that is a credit arrangement between two businesses; school fees
 * are due by a date in the school's own calendar, and every school states it
 * differently. So the four rules are offered in the school's own words, and
 * each one shows the date it would put on a bill raised today.
 *
 * That preview is the point of the screen. "End of the term billed" is an
 * abstraction until it reads 15 December, and the backend prices it with the
 * same function that bills, so what is shown here cannot drift from what a
 * bursar will get. A school whose calendar is not set up yet has no term to
 * resolve against, and the screen says so rather than showing a date it made up.
 *
 * School-only, which is why it lives here and not in @xvs/finance: the endpoint
 * is the FAL's, and CodeX does not bill anybody school fees.
 */

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { cn } from "@/lib/utils";
import {
  useGetFeeDuePolicyQuery,
  useUpdateFeeDuePolicyMutation,
  type FeeDueBasis,
} from "@/redux/services/school-finance/fee-due-policy-api";

/** 12 December 2026, from the API's ISO date. */
function formatDue(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function FeeDuePolicySettings() {
  const { data, isLoading, isError } = useGetFeeDuePolicyQuery();
  const [save, { isLoading: isSaving }] = useUpdateFeeDuePolicyMutation();

  const policy = data?.data;
  const [basis, setBasis] = useState<FeeDueBasis | null>(null);
  const [days, setDays] = useState<string>("");

  // Seed the form from the server once it answers, and again whenever it
  // answers differently - after a save, the server's copy is the truth.
  useEffect(() => {
    if (!policy) return;
    setBasis(policy.basis);
    setDays(String(policy.days_after));
  }, [policy?.basis, policy?.days_after]);

  if (isLoading) {
    return <p className="font-mont text-xs text-gray-05">Loading…</p>;
  }
  if (isError || !policy) {
    return (
      <p className="font-mont text-xs text-gray-05">
        This school's fee due rule could not be loaded.
      </p>
    );
  }

  const daysNumber = Number(days);
  const daysValid =
    days.trim() !== "" && Number.isInteger(daysNumber) &&
    daysNumber >= 0 && daysNumber <= 365;
  // Only the number attached to the chosen rule can block saving. A school on
  // "end of term" with a stale number in the box it is not using is not stuck.
  const blocked = basis === "DAYS_AFTER" && !daysValid;
  const changed =
    basis !== policy.basis ||
    (basis === "DAYS_AFTER" && daysNumber !== policy.days_after);

  const onSave = async () => {
    if (!basis || blocked || !changed) return;
    await save(
      basis === "DAYS_AFTER" ? { basis, days_after: daysNumber } : { basis },
    ).unwrap().catch(() => undefined);
  };

  const { session, term } = policy.resolved_against;

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="Fee due dates"
        description="When a fee bill falls due once it is raised. One rule for the whole school, so a child and their sibling at another branch are due on the same day."
        action={
          <Button
            onClick={onSave}
            disabled={!changed || blocked || isSaving}
            className="font-mont text-xs"
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        }
      />

      <SettingsPanel
        title="Rule"
        description={
          session
            ? `Dates below are worked out against ${term ? `${term}, ` : ""}${session}.`
            : "This school has no active academic session yet, so term and session dates cannot be worked out. The rules that need them will start resolving once the calendar is set up."
        }
      >
        <div className="p-4 sm:p-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {policy.options.map((option) => {
              const active = option.value === basis;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBasis(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition-colors",
                    active
                      ? "border-primary-01 bg-primary-01/5"
                      : "border-white-02 bg-white hover:border-gray-04",
                  )}
                >
                  <span className="flex items-start gap-2.5">
                    <CalendarClock
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        active ? "text-primary-01" : "text-gray-05",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block font-mont text-xs font-semibold text-gray-01">
                        {option.label}
                      </span>
                      {/* The whole reason the screen is legible: the rule in the
                          school's own calendar, not in the abstract. */}
                      <span className="mt-1 block font-mont text-[11px] leading-4 text-gray-05">
                        A bill raised today would be due{" "}
                        <span className="font-medium text-gray-02">
                          {formatDue(option.due_if_billed_today)}
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {basis === "DAYS_AFTER" ? (
            <div className="mt-4 border-t border-white-02 pt-4">
              <label
                htmlFor="fee-due-days"
                className="font-mont text-xs font-medium text-gray-01"
              >
                Days after the bill
              </label>
              <Input
                id="fee-due-days"
                type="number"
                min={0}
                max={365}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="mt-1.5 max-w-32 font-mont text-xs"
                aria-invalid={!daysValid}
                aria-describedby="fee-due-days-help"
              />
              <p
                id="fee-due-days-help"
                className={cn(
                  "mt-1.5 font-mont text-[11px] leading-4",
                  daysValid ? "text-gray-05" : "text-red-01",
                )}
              >
                {daysValid
                  ? "Zero means due the day it is raised."
                  : "Enter a whole number of days between 0 and 365."}
              </p>
            </div>
          ) : null}
        </div>
      </SettingsPanel>
    </div>
  );
}
