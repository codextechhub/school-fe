import { useState } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { useLiftHoldMutation, usePlaceHoldMutation } from "@/redux/services/gradebook/gradebook-api";
import type { HoldRow } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { formatKoboAsNaira } from "@/utils/user-facing-message";

/**
 * Holding a student's result over fees, or lifting the hold.
 *
 * The drawer shows what Finance says the family owes, as context and never as
 * a rule: no result is ever held automatically, and the reason for a hold is
 * the person's own. Holding needs a reason; lifting takes an optional note.
 * Lifting on a class already published releases the result and emails the
 * guardian; before publication the result simply goes out with the class.
 * The list does not say which applies, so the drawer names both and the
 * toast afterwards says which happened.
 *
 * Field Access: the balance lines follow the balance switch, and the reason
 * and lift note share the hold-reason switch. A role that may not write the
 * reason cannot hold, because a hold without one is refused; it can still
 * lift, without a note.
 */
export function HoldDrawer({
  row,
  term,
  onClose,
}: {
  row: HoldRow;
  term: number;
  onClose: () => void;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_HOLD);
  const { formatDate } = useSchoolDisplay(row.branch?.id ?? null);
  const [note, setNote] = useState("");
  const [place, placing] = usePlaceHoldMutation();
  const [lift, lifting] = useLiftHoldMutation();
  const hold = row.hold;
  const writesNote = !access.isReadOnly(hold ? "lift_note" : "reason");
  const showsBalance = !access.isHidden("balance");

  const onSave = async () => {
    if (hold) {
      const result = await lift({ holdId: hold.id, ...(writesNote && note.trim() ? { note: note.trim() } : {}) });
      if ("error" in result) return;
      toast.success("Hold lifted", {
        description: result.data.data.released
          ? `${row.student.name}'s result is released, and the guardian has been emailed that the report card is ready.`
          : `${row.student.name}'s result will be released with the class.`,
      });
    } else {
      const result = await place({ student: row.student.id, term, reason: note.trim() });
      if ("error" in result) return;
      toast.warning("Result held", {
        description: `${row.student.name}'s result will not be released until the hold is lifted.`,
      });
    }
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={hold ? `Lift the hold on ${row.student.name}` : `Hold ${row.student.name}'s result`}
      subtitle={
        hold
          ? "If the class is published, lifting releases the result and emails the guardian. If not, it goes out with the class."
          : "The result is still approved and locked. It is simply not released."
      }
      saveLabel={hold ? "Lift the hold" : "Hold this result"}
      onSave={() => void onSave()}
      canSave={hold ? true : !!note.trim()}
      saving={placing.isLoading || lifting.isLoading}
    >
      <div className="space-y-4">
        <dl className="divide-y divide-border rounded-md border border-border text-sm">
          {showsBalance && (
            <>
              <Line
                label="Balance (from Finance)"
                value={row.balance === null || row.balance === undefined ? "Finance did not answer" : formatKoboAsNaira(row.balance)}
              />
              <Line
                label="Oldest unpaid"
                value={
                  row.oldest_unpaid_on
                    ? `${formatDate(row.oldest_unpaid_on)} · ${row.days_owed ?? 0} days`
                    : "-"
                }
              />
            </>
          )}
          <Line label="Class" value={row.class.name} />
          {hold && (
            <Line
              label="Held"
              value={[hold.placed_by ? `by ${hold.placed_by}` : null, formatDate(hold.placed_at)].filter(Boolean).join(" · ")}
            />
          )}
          {hold?.reason && <Line label="Reason" value={hold.reason} />}
        </dl>
        {writesNote && (
          <Field label={hold ? "Note (optional)" : "Reason for the hold"} required={!hold}>
            <Textarea
              rows={4}
              maxLength={500}
              value={note}
              placeholder={hold ? "For example: paid in full on 18 December." : "For example: two terms unpaid; the family asked to see the bursar."}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        )}
        <p className="text-xs leading-5 text-gray-05">
          No mark is shown on this screen, and no result is ever held automatically.
        </p>
      </div>
    </DrawerShell>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <dt className="text-gray-06">{label}</dt>
      <dd className="text-right font-medium text-black-01">{value}</dd>
    </div>
  );
}
