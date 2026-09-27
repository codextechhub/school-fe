import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchSelect } from "@/components/custom/search-select";
import { Field } from "@/pages/protected/academics/components/entity-drawer";
import { parseApiError } from "@/utils/api-error";
import type {
  ClashWarning,
  Room,
  TeacherRow,
  TimetableSlot,
} from "@/redux/services/calendar/calendar-types";
import type { Subject } from "@/redux/services/academics/academics-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { problemsOf, useFormProblems } from "./form-problems";
import { ClashPreview } from "./clash-preview";
import { useClashPreview } from "./use-clash-preview";
import { ProblemSummary } from "./problem-summary";
import { useAcademicsLens } from "@/hooks/use-academics-lens";

/**
 * One cell of one class's week.
 *
 * **A clash saves.** This is the rule the whole screen is shaped around, and it
 * is not a bug being tolerated: a school that discovers at Period 5 that Mrs
 * Adeyemi is already booked needs to save the grid, see both cells in red, and
 * resolve them when the head of department is back on Monday. The refusal
 * belongs at publication, which is the one moment the school asserts the grid
 * is finished. So a clash arrives here as a WARNING beside a row that was
 * written, the drawer closes, and the cell turns red.
 *
 * **The teacher list is every teacher of the school, never the branch's.** Mr
 * Eze teaches Physics at Lekki on Monday to Wednesday and at Ikeja on Thursday
 * and Friday; a picker filtered by the branch being edited would make him
 * unschedulable at the second. What makes the wide picker safe is that the
 * clash query is wide too.
 *
 * **The room list IS narrowed**, and for the opposite reason: a room is a
 * physical place, and a class cannot be scheduled into one at another branch.
 * The server refuses that outright, so offering it would be offering a refusal.
 *
 * **What the reader may do shapes the footer.** Clearing a slot is a delete and
 * is offered only when `onRemove` is passed, which the screen does for a
 * reader holding the delete key. The clash preview runs on the server's create
 * key, so a reader who may edit lessons but not add them saves without the
 * live preview (`canPreview` false) and learns of a clash from the save.
 */

export interface LessonTarget {
  /** Null when filling an empty cell. */
  slot: TimetableSlot | null;
  period: number;
  periodLabel: string;
  dayOfWeek: number;
  dayLabel: string;
}

export interface LessonValues {
  subject: number | null;
  teacher: number | null;
  room: number | null;
}

export function LessonDrawer({
  open,
  target,
  className,
  subjects,
  teachers,
  rooms,
  saving,
  removing,
  onClose,
  onSave,
  onRemove,
  onPreview,
  canPreview = true,
}: {
  open: boolean;
  target: LessonTarget | null;
  /** The class whose week this is, for the header. */
  className: string;
  subjects: Subject[];
  teachers: TeacherRow[];
  rooms: Room[];
  saving: boolean;
  removing: boolean;
  onClose: () => void;
  onSave: (values: LessonValues) => Promise<ClashWarning[]>;
  /** Clears the slot. Omitted for a reader who may not delete lessons. */
  onRemove?: () => Promise<void>;
  /** Asks the server what this draft would clash with. Writes nothing. */
  onPreview: (values: LessonValues) => Promise<{ warnings: ClashWarning[] }>;
  /** Whether the reader holds the key the preview endpoint asks for. */
  canPreview?: boolean;
}) {
  // Rooms are only named with their branch for a reader who works across branches.
  const { multiBranch } = useAcademicsLens();
  const [values, setValues] = useState<LessonValues>({
    subject: null,
    teacher: null,
    room: null,
  });
  const [refusal, setRefusal] = useState("");

  // Subject is the only required one. A grid is legitimately built subjects
  // first and people later, and the publish gate is what refuses an unstaffed
  // week - not this form.
  const problems = problemsOf(
    !values.subject && { field: "subject", message: "Pick a subject." },
  );
  const { attempt, errorFor, showing, reset } = useFormProblems(problems);

  // Asked as soon as there is a person or a place to ask about. A subject on
  // its own cannot clash with anything: two classes may study Mathematics at
  // the same hour all week.
  const clash = useClashPreview({
    values,
    ready:
      canPreview && open && !!target && (!!values.teacher || !!values.room),
    ask: onPreview,
  });

  const openedFor = open && target ? `${target.dayOfWeek}:${target.period}:${target.slot?.id ?? "new"}` : "shut";
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    if (open && target) {
      setValues({
        subject: target.slot?.subject ?? null,
        teacher: target.slot?.teacher?.id ?? null,
        room: target.slot?.room ?? null,
      });
      setRefusal("");
      reset();
      clash.reset();
    }
  }

  const editing = !!target?.slot;

  const save = async () => {
    if (!attempt()) return;
    try {
      await onSave(values);
      onClose();
    } catch (error) {
      setRefusal(
        parseApiError(error).message || "That lesson could not be saved.",
      );
    }
  };

  const remove = async () => {
    if (!onRemove) return;
    try {
      await onRemove();
      onClose();
    } catch (error) {
      setRefusal(
        parseApiError(error).message || "That lesson could not be cleared.",
      );
    }
  };

  return (
    <Sheet open={open && !!target} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="truncate font-mont text-base">
            {editing ? "Edit lesson" : "Add lesson"}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01">
            {className} · {target?.dayLabel} · {target?.periodLabel}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea data-guide="lesson-drawer.fields" className="flex-1" viewportClassName="px-5 py-5">
          <Field
            label="Subject *"
            error={errorFor("subject")}
          >
            <SearchSelect
              aria-label="Subject"
              placeholder="Search subjects"
              value={values.subject ? String(values.subject) : ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  subject: e.target.value ? Number(e.target.value) : null,
                }))
              }
              options={subjects.map((s) => ({
                value: String(s.id),
                label: s.name,
              }))}
            />
          </Field>

          <div className="mt-4">
            <Field label="Teacher">
              <SearchSelect
                aria-label="Teacher"
                placeholder="Search teachers"
                value={values.teacher ? String(values.teacher) : ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    teacher: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                options={teachers.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                }))}
              />
            </Field>
            <p className="mt-1 text-xs text-gray-05 text-pretty">
              Every teacher at the school, including those who work across
              branches. Leave it empty to fill the subjects now and the people
              later.
            </p>
          </div>

          <div className="mt-4">
            <Field label="Room">
              <SearchSelect
                aria-label="Room"
                placeholder="Search rooms"
                value={values.room ? String(values.room) : ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    room: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                options={rooms.map((r) => ({
                  value: String(r.id),
                  label: multiBranch && r.branch_name ? `${r.name} · ${r.branch_name}` : r.name,
                }))}
              />
            </Field>
            <p className="mt-1 text-xs text-gray-05 text-pretty">
              Only rooms at this class's branch. A class cannot be scheduled
              into a room somewhere else.
            </p>
          </div>

          {/* The rule, while there is no clash to apply it to. Once one is
              found the box below says the same thing about a real collision
              and names it, so leaving this here would say it twice - once in
              the abstract, once about Mr Eze, an inch apart. */}
          {clash.warnings.length === 0 && (
            <p className="mt-5 rounded-lg border border-white-02 bg-white-05 px-3 py-2.5 text-xs text-gray-06 text-pretty">
              A clash does not stop this saving. If the teacher or the room is
              already booked, both cells stay flagged in red and publishing is
              blocked until it is resolved.
            </p>
          )}

          {refusal && (
            <p className="mt-4 text-xs text-error-text text-pretty">{refusal}</p>
          )}
          <ClashPreview
            warnings={clash.warnings}
            asking={clash.asking}
            acknowledged={clash.acknowledged}
            onAcknowledge={clash.setAcknowledged}
            confirmLabel="I know, save it with the clash. The grid cannot be published until it is resolved."
          />
        </ScrollArea>

        <div data-guide="lesson-drawer.actions" className="shrink-0 border-t border-white-02 pt-4">
          <ProblemSummary problems={showing} />
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 pb-4">
          {editing && onRemove && (
            <Button
              variant="ghost"
              className="mr-auto text-error-text"
              onClick={remove}
              disabled={removing || saving}
            >
              {removing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Clear this slot
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {/* Live even when the draft is incomplete: pressing it is how a
              reader finds out what is missing. It DOES go quiet on an
              unacknowledged clash, and that is not the same thing - the reason
              is a box on screen an inch above it, with the tick that clears
              it. */}
          <Button onClick={save} disabled={saving || clash.blocked}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save changes" : "Add lesson"}
          </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
