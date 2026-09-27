import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import { DatePickerInput } from "@/components/ui/date-picker-input";
import { NativeSelect } from "@/components/ui/native-select";
import { writeErrorMessage } from "@/utils/api-error";
import {
  useAssignClassMutation,
  useGetClassSeatsQuery,
} from "@/redux/services/students/students-api";
import {
  TRANSFER_REASONS,
  type StudentDetail,
} from "@/redux/services/students/students-types";
import { todayIso } from "@/lib/as-at";

import { DrawerShell, Field, inputClass } from "./drawer-shell";

/** Today on this device, not in UTC: before 1am in Lagos they differ. */
function today() {
  return todayIso();
}

/**
 * Move a student into a class, or between two.
 *
 * One route for both. Whether this is an assignment or a transfer depends on
 * whether the student already had a class, which the server knows - encoding it
 * again here would be a second opinion that can differ.
 *
 * **The seat count is fetched for the class the user picks, not for all of
 * them.** There is no endpoint returning seats for every class at once (the
 * phase 2 backend ask), and firing one roster request per option to label a
 * dropdown would cost a request per class on every open. The design only shows
 * the destination's seats after a selection anyway, so nothing is lost.
 *
 * **Over capacity is an acknowledgement, not a preference.** The first save
 * sends `allow_over_capacity: false`; the server refuses, and only then does
 * the screen say so and offer to go ahead. A screen that pre-ticked it would be
 * answering a question the server asked the registrar.
 */
export function TransferDrawer({
  student,
  open,
  onClose,
}: {
  /**
   * Only what this drawer actually reads.
   *
   * Asking for a whole StudentDetail would force the class register to fetch
   * one per row just to offer a Move button, when the row it already has
   * carries every field used here.
   */
  student: Pick<
    StudentDetail,
    "id" | "first_name" | "full_name" | "class_name" | "branch"
  >;
  open: boolean;
  onClose: () => void;
}) {
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [effective, setEffective] = useState(today());
  const [override, setOverride] = useState(false);

  // No lens, deliberately. This picker feeds a WRITE, and a placement is
  // always made in the year the school is running - the backend refuses one
  // against a closed year. Offering last year's classes while somebody browses
  // last year would offer a seat that cannot be taken.
  const { data: classesData } = useGetClassSeatsQuery();
  // The student's own branch, or school-wide, and nothing else: the server
  // refuses a placement that crosses branches, so offering one here would walk
  // the registrar into a refusal. A class with no branch is school-wide, and at
  // a single-branch school the field is absent so nothing is filtered out.
  const classes = (classesData?.data ?? []).filter(
    (c) =>
      c.name !== student.class_name &&
      (c.branch == null || student.branch == null || c.branch === student.branch),
  );

  const destinationId = Number(destination) || 0;
  // The seats come from the list that drew the options, so there is no second
  // request and no way for the label and the warning to disagree.
  const chosen = classes.find((c) => c.id === destinationId);
  const used = chosen?.used;
  const capacity = chosen?.capacity ?? null;
  const wouldOverfill =
    used != null && capacity != null && used + 1 > capacity;

  const [assign, { isLoading }] = useAssignClassMutation();
  const valid = destinationId > 0 && Boolean(reason) && Boolean(effective);

  function reset() {
    setDestination("");
    setReason("");
    setEffective(today());
    setOverride(false);
  }

  async function save() {
    if (!valid) return;
    try {
      await assign({
        id: student.id,
        school_class: destinationId,
        ...(reason ? { reason } : {}),
        effective_date: effective,
        allow_over_capacity: override,
      }).unwrap();
      toast.success(
        `${student.full_name} moved to ${chosen?.name ?? "the new class"}.`,
      );
      reset();
      onClose();
    } catch (error) {
      const message = writeErrorMessage(error, "We could not move that student.");
      // The server refuses an over-capacity placement until it is acknowledged.
      // Rather than translating its refusal into our own guess, offer the
      // acknowledgement and let the next attempt carry it.
      if (/capacit/i.test(message) && !override) {
        setOverride(true);
        toast.warning(`${message} Save again to go ahead anyway.`);
        return;
      }
      toast.error(message);
    }
  }

  return (
    <DrawerShell
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={student.class_name ? "Transfer class" : "Assign a class"}
      subtitle={`${student.full_name} · ${student.class_name || "no class yet"}`}
      saveLabel={
        override
          ? "Move anyway"
          : student.class_name
            ? "Move student"
            : "Assign student"
      }
      onSave={save}
      canSave={valid}
      saving={isLoading}
      destructive={override}
      wide
    >
      <div className="grid gap-4">
        <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="text-xs text-gray-05">From</p>
            <p className="mt-1 text-sm font-semibold text-black-01">
              {student.class_name || "No class yet"}
            </p>
          </div>
          <ArrowRight className="mx-auto size-4 rotate-90 text-gray-05 sm:rotate-0" />
          <div className="rounded-lg border border-border bg-pry-01 px-4 py-3">
            <p className="text-xs text-gray-05">To</p>
            <p className="mt-1 text-sm font-semibold text-primary">
              {chosen?.name || "Not picked yet"}
            </p>
          </div>
        </div>

        <Field label="Destination class" required>
          <NativeSelect
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setOverride(false);
            }}
            className="h-9"
            required
          >
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.capacity == null
                  ? ` · ${c.used} enrolled`
                  : ` · ${c.used}/${c.capacity}`}
              </option>
            ))}
          </NativeSelect>
        </Field>

        {destinationId > 0 && (
          <p className="rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
            {capacity == null
              ? `${used ?? 0} students. This class has no capacity set.`
              : `${used} of ${capacity} seats used.`}
          </p>
        )}

        {wouldOverfill && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            That class is at capacity. Moving {student.first_name} in will put it
            over. You can still do it.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Reason" required>
            <NativeSelect
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9"
              required
            >
              <option value="">Select a reason</option>
              {TRANSFER_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Effective date" required>
            <DatePickerInput
              value={effective}
              onChange={(e) => setEffective(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
        </div>

        <p className="text-xs text-gray-05">
          This move is written to {student.first_name}&apos;s history with your
          name against it.
        </p>
      </div>
    </DrawerShell>
  );
}
