import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchSelect } from "@/components/custom/search-select";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/utils/api-error";
import {
  useAssignTeachingMutation,
  useGetStaffListQuery,
  useRemoveTeachingMutation,
  useSetTeachingPartMutation,
} from "@/redux/services/staff/staff-api";
import type {
  CoverageCell,
  TeachingPart,
} from "@/redux/services/staff/staff-types";

import { DrawerShell, Field } from "../../students/drawers/drawer-shell";

/**
 * Who teaches one subject in one class, asked of the subject rather than of a
 * person.
 *
 * **The screen's other drawer asks the same question from the other end**, and
 * both are needed. "What does Mrs. Adeyemi teach" is a question about a person
 * and belongs on her; "who teaches JSS2 A Mathematics" is a question about a
 * class subject and has no person to hang off at all until somebody is put
 * there. Pressing an empty square used to send the reader to the list of
 * teachers with the square they pressed thrown away, so the one thing they had
 * already decided - which subject in which class - had to be decided again in
 * a drawer that never mentioned it.
 *
 * **The main teacher is the one who enters the subject's results for that
 * class.** Everybody else on it is assisting. There is at most one main
 * teacher, and moving somebody into the part is how the server frees it - it
 * refuses a second and names the person holding it, so nobody discovers
 * afterwards that the teacher who had SSS2 Physics no longer does.
 *
 * **Being a class subject's main teacher is not being the class teacher.** One
 * carries a subject and its results; the other looks after the class itself,
 * lives on the class rather than on an assignment, and is set in its own panel.
 * Somebody can be either without the other, in both directions.
 *
 * The cell is passed in live rather than captured when the drawer opens, so a
 * change made here is reflected in the list behind it and in the drawer at
 * once, from the one query that owns the answer.
 */
export function PairingDrawer({
  cell,
  onClose,
}: {
  cell: CoverageCell;
  onClose: () => void;
}) {
  const { data: staffData } = useGetStaffListQuery({ page: 1 });

  const [assign, { isLoading: assigning }] = useAssignTeachingMutation();
  const [setPart, { isLoading: changingPart }] = useSetTeachingPartMutation();
  const [remove, { isLoading: removing }] = useRemoveTeachingMutation();

  const [staffId, setStaffId] = useState("");
  const [part, setPartChoice] = useState<TeachingPart>(
    // A square with nobody on it is nearly always somebody being given the
    // subject outright, so that is what the form is already set to. Where
    // there IS a main teacher the server would refuse a second, so the form
    // opens on the part it can actually save.
    cell.lead ? "ASSISTANT" : "LEAD",
  );

  // Somebody resigned or terminated is left out: handing them a class is a
  // mistake nothing downstream would catch, because an assignment carries no
  // end date of its own.
  const people = useMemo(
    () =>
      (staffData?.data ?? [])
        .filter(
          (person) =>
            person.employment_status !== "RESIGNED" &&
            person.employment_status !== "TERMINATED",
        )
        .map((person) => ({
          value: String(person.id),
          label: person.job_title
            ? `${person.full_name} - ${person.job_title}`
            : person.full_name,
        })),
    [staffData],
  );

  const onIt = [
    ...(cell.lead ? [{ ...cell.lead, part: "LEAD" as TeachingPart }] : []),
    ...cell.assistants.map((person) => ({
      ...person,
      part: "ASSISTANT" as TeachingPart,
    })),
  ];

  // Named rather than left to the server's refusal: "they already teach this"
  // is a sentence somebody can act on, and the row to act on is above.
  const already = onIt.some((person) => String(person.staff_id) === staffId);
  const busy = assigning || changingPart || removing;
  const where = `${cell.subject_name} in ${cell.class_name}`;

  async function add() {
    try {
      await assign({
        id: Number(staffId),
        body: {
          school_class: cell.class_id,
          subject: cell.subject_id,
          part,
        },
      }).unwrap();
      toast.success(
        part === "LEAD"
          ? `They are the main teacher for ${where}.`
          : `They are assisting with ${where}.`,
      );
      setStaffId("");
    } catch (error) {
      // The refusal for a second main teacher names the person who holds it,
      // so it is worth showing whole rather than replacing with a generic line.
      toast.error(
        apiErrorMessage(error, "We could not record that. Try again."),
      );
    }
  }

  async function changePart(assignmentId: number, next: TeachingPart) {
    try {
      await setPart({ assignmentId, part: next }).unwrap();
      toast.success(
        next === "LEAD"
          ? `They are now the main teacher for ${where}.`
          : `They are now assisting with ${where}.`,
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not change that. Try again."),
      );
    }
  }

  async function drop(assignmentId: number, name: string) {
    try {
      await remove(assignmentId).unwrap();
      toast.success(`${name} no longer teaches ${where}.`);
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not remove that. Try again."),
      );
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={cell.subject_name}
      subtitle={`Who teaches it to ${cell.class_name}.`}
      saveLabel="Add them"
      onSave={() => void add()}
      canSave={Boolean(staffId) && !already}
      saving={assigning}
    >
      <div className="grid gap-5">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-black-01">
            Teaching it now
          </h3>
          {onIt.length ? (
            <ul className="grid gap-2.5">
              {onIt.map((person) => (
                <li
                  key={person.assignment_id}
                  className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm text-black-01">
                    {person.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      person.part === "LEAD"
                        ? "bg-[#DBE0EB] text-[#4A659D]"
                        : "bg-gray-04 text-gray-05",
                    )}
                  >
                    {person.part === "LEAD" ? "Main teacher" : "Assisting"}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    {person.part === "ASSISTANT" ? (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void changePart(person.assignment_id, "LEAD")
                        }
                      >
                        <ArrowUp className="size-3.5" />
                        Make main
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void changePart(person.assignment_id, "ASSISTANT")
                        }
                      >
                        <ArrowDown className="size-3.5" />
                        Move to assisting
                      </Button>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${person.name} from ${where}`}
                      disabled={busy}
                      onClick={() =>
                        void drop(person.assignment_id, person.name)
                      }
                      className="rounded-lg p-2 text-gray-05 hover:bg-gray-03 hover:text-error-text"
                    >
                      <X className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-gray-04 px-3.5 py-2.5 text-[13px] text-gray-01">
              Nobody teaches this yet.
            </p>
          )}

          {/* Said where it is true rather than as a permanent warning. A class
              subject being taught with nobody entering its results is the one
              state that looks fine in a list and is not. */}
          {cell.lead_gap && (
            <p className="mt-2.5 rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              Somebody is teaching this, but no one is set to enter its results.
              Make one of them the main teacher.
            </p>
          )}
        </section>

        <section className="border-t border-white-02 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-black-01">
            Add a teacher
          </h3>
          <div className="grid gap-4">
            <div>
              <SearchSelect
                label="Teacher"
                isRequired
                options={people}
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="Search staff by name"
              />
            </div>

            <Field
              label="Their part"
              required
              hint="The main teacher enters this subject's results for this class. Anyone else assisting also teaches it, and there can be several."
            >
              <NativeSelect
                aria-label="Their part"
                value={part}
                onChange={(e) => setPartChoice(e.target.value as TeachingPart)}
                className="h-9"
              >
                <option value="LEAD">Main teacher</option>
                <option value="ASSISTANT">Assisting</option>
              </NativeSelect>
            </Field>

            {already && (
              <p className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                They already teach this. Change their part on the row above
                instead.
              </p>
            )}

            {part === "LEAD" && cell.lead && (
              <p className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                {cell.lead.name} is already the main teacher, and a class
                subject has only one. Move them to assisting first, or add this
                person as assisting.
              </p>
            )}

            <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
              <Info className="mt-px size-3.5 shrink-0 text-primary" />
              This says who teaches it. When and where the lessons happen is the
              timetable's, and being the main teacher for a subject is not the
              same as being the class teacher for {cell.class_name}.
            </p>
          </div>
        </section>
      </div>
    </DrawerShell>
  );
}
