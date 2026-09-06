import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/utils/api-error";
import {
  useGetClassesQuery,
  useGetSubjectsQuery,
} from "@/redux/services/academics/academics-api";
import {
  useAssignTeachingMutation,
  useGetStaffTeachingQuery,
  useRemoveTeachingMutation,
  useSetTeachingPartMutation,
} from "@/redux/services/staff/staff-api";
import type { TeachingPart } from "@/redux/services/staff/staff-types";

import { DrawerShell, Field } from "../../students/drawers/drawer-shell";

/**
 * What one person teaches, and the three ways it changes.
 *
 * **A duty is a pairing, and the pairing is the unit.** A subject in a class can
 * be taught by more than one person: one leads it and owns the marks, the
 * others assist. So this assigns a person to a pairing rather than handing them
 * a subject, and the part is asked for every time.
 *
 * **At most one lead per pairing, and displacing one is deliberate.** The
 * server refuses a second lead and names the person who already has it, so
 * nobody discovers afterwards that the teacher who had SSS2 Physics no longer
 * does. Stepping the current lead back is the way to free it, which is a
 * separate act on a separate row.
 *
 * **An assignment says what, never when.** No day, no period, no room: that is
 * the timetable's, and a school with a paper timetable still needs this.
 */
export function AssignDutiesDrawer({
  staffId,
  personName,
  /** Pre-selected when the drawer opens from a cell in the coverage grid. */
  initialClassId,
  initialSubjectId,
  onClose,
}: {
  staffId: number;
  personName: string;
  initialClassId?: number;
  initialSubjectId?: number;
  onClose: () => void;
}) {
  const teaching = useGetStaffTeachingQuery({ id: staffId });
  const { data: subjectData } = useGetSubjectsQuery();
  const { data: classData } = useGetClassesQuery();

  const [assign, { isLoading: assigning }] = useAssignTeachingMutation();
  const [setPart, { isLoading: changingPart }] = useSetTeachingPartMutation();
  const [remove, { isLoading: removing }] = useRemoveTeachingMutation();

  const [classId, setClassId] = useState(
    initialClassId ? String(initialClassId) : "",
  );
  const [subjectId, setSubjectId] = useState(
    initialSubjectId ? String(initialSubjectId) : "",
  );
  const [part, setPartChoice] = useState<TeachingPart>("LEAD");

  const subjects = useMemo(() => subjectData?.data ?? [], [subjectData]);
  const classes = useMemo(() => classData?.data ?? [], [classData]);
  const existing = teaching.data?.data.assignments ?? [];

  // Named rather than silently refused: the server would answer a duplicate,
  // and "they already teach that" is a sentence somebody can act on.
  const duplicate = existing.some(
    (row) =>
      String(row.school_class_id) === classId &&
      String(row.subject_id) === subjectId,
  );

  async function add() {
    try {
      await assign({
        id: staffId,
        body: {
          school_class: Number(classId),
          subject: Number(subjectId),
          part,
        },
      }).unwrap();
      toast.success("Teaching duty recorded.");
      setClassId("");
      setSubjectId("");
    } catch (error) {
      // The lead-already-set refusal names the holder, so it is worth showing
      // whole rather than replacing with a generic sentence.
      toast.error(
        apiErrorMessage(error, "We could not record that duty. Try again."),
      );
    }
  }

  async function changePart(id: number, next: TeachingPart) {
    try {
      await setPart({ assignmentId: id, part: next }).unwrap();
      toast.success(
        next === "LEAD" ? "They now lead it." : "They now assist with it.",
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not change that. Try again."),
      );
    }
  }

  async function drop(id: number) {
    try {
      await remove(id).unwrap();
      toast.success("Teaching duty removed.");
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not remove that duty. Try again."),
      );
    }
  }

  const busy = assigning || changingPart || removing;

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Teaching duties"
      subtitle={`What ${personName} teaches in ${teaching.data?.data.session.name ?? "this year"}.`}
      saveLabel="Add duty"
      onSave={() => void add()}
      canSave={Boolean(classId) && Boolean(subjectId) && !duplicate}
      saving={assigning}
    >
      <div className="grid gap-5">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-black-01">
            Already assigned
          </h3>
          {teaching.isLoading ? (
            <p className="text-[13px] text-gray-05">Loading…</p>
          ) : existing.length ? (
            <ul className="grid gap-2.5">
              {existing.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-black-01">
                      {row.subject_name}
                    </span>
                    <span className="block truncate text-xs text-gray-05">
                      {row.class_name}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      row.part === "LEAD"
                        ? "bg-[#DBE0EB] text-[#4A659D]"
                        : "bg-gray-04 text-gray-05",
                    )}
                  >
                    {row.part_label}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    {row.part === "ASSISTANT" ? (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void changePart(row.id, "LEAD")}
                      >
                        <ArrowUp className="size-3.5" />
                        Make lead
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void changePart(row.id, "ASSISTANT")}
                      >
                        <ArrowDown className="size-3.5" />
                        Step back
                      </Button>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${row.subject_name} in ${row.class_name}`}
                      disabled={busy}
                      onClick={() => void drop(row.id)}
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
              Nothing yet this session.
            </p>
          )}
        </section>

        <section className="border-t border-white-02 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-black-01">
            Add a duty
          </h3>
          <div className="grid gap-4">
            <Field label="Class" required>
              <NativeSelect
                aria-label="Class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="h-9"
              >
                <option value="">Choose a class</option>
                {classes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Subject" required>
              <NativeSelect
                aria-label="Subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="h-9"
              >
                <option value="">Choose a subject</option>
                {subjects.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              label="Their part"
              required
              hint="A lead owns the marks for this pairing. Assistants help with it, and a pairing can have several."
            >
              <NativeSelect
                aria-label="Their part"
                value={part}
                onChange={(e) => setPartChoice(e.target.value as TeachingPart)}
                className="h-9"
              >
                <option value="LEAD">Lead</option>
                <option value="ASSISTANT">Assistant</option>
              </NativeSelect>
            </Field>

            {duplicate && (
              <p className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                {personName} already teaches that subject in that class. Change
                their part on the row above instead.
              </p>
            )}

            <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
              <Info className="mt-px size-3.5 shrink-0 text-primary" />
              This says what they teach. When and where it happens is the
              timetable&apos;s, and nothing here schedules a lesson.
            </p>
          </div>
        </section>
      </div>
    </DrawerShell>
  );
}
