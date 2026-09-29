import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchSelect } from "@/components/custom/search-select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Field } from "@/pages/protected/academics/components/entity-drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/utils/api-error";
import type {
  ClashWarning,
  ExamSlotWrite,
  Invigilator,
  Person,
  Room,
  Sitting,
} from "@/redux/services/calendar/calendar-types";
import { invigilatorOptions, type PaperValues } from "./paper-values";
import { problemsOf, useFormProblems } from "./form-problems";
import { ProblemSummary } from "./problem-summary";
import { ClashPreview } from "./clash-preview";
import { useClashPreview } from "./use-clash-preview";
import type {
  SchoolClass,
  Subject,
} from "@/redux/services/academics/academics-types";
import { useAcademicsLens } from "@/hooks/use-academics-lens";

/**
 * One paper: which class sits which subject, when, where, supervised by whom.
 *
 * **The refusal and the warnings are the opposite way round from the class
 * timetable, and a school meets both in one afternoon.** On a lesson grid a
 * double-booked teacher WARNS and the write succeeds. Here:
 *
 *   * A class sitting two papers in one sitting is REFUSED. It is physically
 *     impossible and no school ever means it.
 *   * A room used twice, and an invigilator in two rooms, both WARN. Two
 *     classes really do sit in the Main Hall together, and one person really
 *     does float between adjacent rooms - and nothing records how many
 *     candidates a paper has or how many rooms one person can supervise, so
 *     refusing either would be refusing on a guess.
 *
 * The form says which is which rather than letting a school discover it by
 * being stopped once and not the other time.
 *
 * **Times are optional and stay that way.** A school that publishes exact times
 * has them; one that publishes only morning and afternoon does not, and is not
 * made to invent them.
 *
 * **The invigilator list is the school's eligible people, not its teachers.**
 * Who may invigilate is the school's `invigilator_roles` rule, so the list can
 * hold a lab technician or an administrator, each named with the role that
 * makes them eligible. A paper already held by somebody who has since left the
 * list keeps them on offer, so opening it does not quietly clear the field.
 *
 * **What the reader may do shapes the footer.** Removing a paper is a delete
 * and is offered only when `onRemove` is passed, which the screen does for a
 * reader holding the exam delete key. The clash preview runs on the server's
 * exam create key, so a reader who may edit papers but not add them saves
 * without the live preview (`canPreview` false) and meets a refusal on save.
 */

const SITTINGS: { value: Sitting; label: string }[] = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
];

export function PaperDrawer({
  open,
  initial,
  editing,
  periodName,
  periodRange,
  minDate,
  maxDate,
  classes,
  subjects,
  rooms,
  invigilators,
  currentInvigilator,
  saving,
  removing,
  onClose,
  onSave,
  onRemove,
  onPreview,
  canPreview = true,
}: {
  open: boolean;
  initial: PaperValues;
  editing: boolean;
  periodName: string;
  periodRange: string;
  minDate: string;
  maxDate: string;
  classes: SchoolClass[];
  subjects: Subject[];
  rooms: Room[];
  /** Everybody the school allows to invigilate. */
  invigilators: Invigilator[];
  /** The paper's invigilator as saved, kept on offer if no longer eligible. */
  currentInvigilator?: Person | null;
  saving: boolean;
  removing: boolean;
  onClose: () => void;
  onSave: (values: ExamSlotWrite) => Promise<unknown>;
  /** Removes the paper. Omitted for a reader who may not delete papers. */
  onRemove?: () => Promise<void>;
  /** Asks the server what this draft would clash with. Writes nothing. */
  onPreview: (
    values: PaperValues,
  ) => Promise<{ refusal: string | null; warnings: ClashWarning[] }>;
  /** Whether the reader holds the key the preview endpoint asks for. */
  canPreview?: boolean;
}) {
  // Rooms are only named with their branch for a reader who works across branches.
  const { multiBranch } = useAcademicsLens();
  const [values, setValues] = useState<PaperValues>(initial);
  const [refusal, setRefusal] = useState<{ field: string; message: string } | null>(
    null,
  );

  const outsidePeriod =
    !!values.exam_date &&
    (values.exam_date < minDate || values.exam_date > maxDate);
  const timesBackwards =
    !!values.start_time && !!values.end_time && values.end_time <= values.start_time;

  // In the reading order of the form: the first one is where the cursor goes.
  const problems = problemsOf(
    !values.school_class && { field: "school_class", message: "Pick a class." },
    !values.subject && { field: "subject", message: "Pick a subject." },
    !values.exam_date && { field: "exam_date", message: "Pick the date of the paper." },
    outsidePeriod && {
      field: "exam_date",
      message: "The date must fall inside the exam period.",
    },
    timesBackwards && {
      field: "end_time",
      message: "The end time must be after the start time.",
    },
  );
  const { attempt, errorFor, invalid, showing, reset } = useFormProblems(problems);

  // Asked once the paper is placed. A room or an invigilator can collide, and
  // so can the class itself - two papers in one sitting is refused outright,
  // which the preview reports separately so the form does not offer to
  // override something the server will not do.
  const clash = useClashPreview({
    values,
    ready:
      canPreview &&
      open &&
      !!values.school_class &&
      !!values.subject &&
      !!values.exam_date &&
      !timesBackwards,
    ask: onPreview,
  });

  const openedFor = open ? JSON.stringify(initial) : "shut";
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    if (open) {
      setValues(initial);
      setRefusal(null);
      reset();
      clash.reset();
    }
  }

  const patch = (next: Partial<PaperValues>) => {
    setValues((v) => ({ ...v, ...next }));
    setRefusal(null);
  };

  const save = async () => {
    if (!attempt()) return;
    try {
      await onSave({
        school_class: values.school_class!,
        subject: values.subject!,
        exam_date: values.exam_date,
        sitting: values.sitting,
        // Empty means "no answer", and must not become "00:00".
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        room: values.room,
        invigilator: values.invigilator,
      });
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      // A refusal carrying `detail.field` lands under that field:
      // CLASS_ALREADY_SITTING under the class, NOT_AN_INVIGILATOR under the
      // invigilator.
      const field =
        parsed.code === "EXAM_OUTSIDE_EXAM_PERIOD"
          ? "exam_date"
          : parsed.code === "NOT_AN_INVIGILATOR"
            ? "invigilator"
            : String(parsed.detail.field ?? "");
      setRefusal({
        field,
        message: parsed.message || "That paper could not be saved.",
      });
    }
  };

  const remove = async () => {
    if (!onRemove) return;
    try {
      await onRemove();
      onClose();
    } catch (error) {
      setRefusal({
        field: "",
        message:
          parseApiError(error).message || "That paper could not be removed.",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="truncate font-mont text-base">
            {editing ? "Edit paper" : "Add paper"}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01 text-pretty">
            {periodName} · {periodRange}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1" viewportClassName="px-5 py-5">
          <Field
            label="Class *"
            error={
              errorFor("school_class") ||
              (refusal?.field === "school_class" ? refusal.message : "")
            }
          >
            <SearchSelect
              aria-label="Class"
              placeholder="Search classes"
              value={values.school_class ? String(values.school_class) : ""}
              onChange={(e) =>
                patch({
                  school_class: e.target.value ? Number(e.target.value) : null,
                })
              }
              options={classes.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
            />
          </Field>

          <div className="mt-4">
            <Field
              label="Subject *"
              error={errorFor("subject")}
            >
              <SearchSelect
                aria-label="Subject"
                placeholder="Search subjects"
                value={values.subject ? String(values.subject) : ""}
                onChange={(e) =>
                  patch({
                    subject: e.target.value ? Number(e.target.value) : null,
                  })
                }
                options={subjects.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                }))}
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Date *">
              {/* Bounded by the exam period, so a date outside it cannot be
                  picked at all. The server refuses one anyway; this makes the
                  refusal unreachable rather than something to recover from. */}
              <DatePickerInput
                aria-label="Exam date"
                value={values.exam_date}
                min={minDate}
                max={maxDate}
                onChange={(e) => patch({ exam_date: e.target.value })}
                aria-invalid={invalid("exam_date")}
                className={cn(errorFor("exam_date") && "border-error-01")}
              />
            </Field>
            <Field label="Sitting *">
              <div className="flex flex-wrap gap-1.5">
                {SITTINGS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => patch({ sitting: s.value })}
                    aria-pressed={values.sitting === s.value}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs",
                      values.sitting === s.value
                        ? "border-primary bg-pry-01 font-medium text-primary"
                        : "border-white-02 bg-white text-gray-06 hover:bg-gray-04",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          {(outsidePeriod || refusal?.field === "exam_date") && (
            <p className="mt-1.5 text-xs text-error-text text-pretty">
              {outsidePeriod
                ? `This date is outside ${periodName} (${periodRange}).`
                : refusal?.message}
            </p>
          )}

          <div className="mt-4">
            <Field label="Room">
              <SearchSelect
                aria-label="Room"
                placeholder="Search rooms"
                value={values.room ? String(values.room) : ""}
                onChange={(e) =>
                  patch({ room: e.target.value ? Number(e.target.value) : null })
                }
                options={rooms.map((r) => ({
                  value: String(r.id),
                  label: multiBranch && r.branch_name ? `${r.name} · ${r.branch_name}` : r.name,
                }))}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Invigilator"
              error={refusal?.field === "invigilator" ? refusal.message : ""}
            >
              <SearchSelect
                aria-label="Invigilator"
                placeholder="Search people"
                value={values.invigilator ? String(values.invigilator) : ""}
                onChange={(e) =>
                  patch({
                    invigilator: e.target.value ? Number(e.target.value) : null,
                  })
                }
                options={invigilatorOptions(invigilators, currentInvigilator)}
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Start time">
              <Input
                type="time"
                value={values.start_time}
                onChange={(e) => patch({ start_time: e.target.value })}
              />
            </Field>
            <Field label="End time">
              <Input
                type="time"
                value={values.end_time}
                onChange={(e) => patch({ end_time: e.target.value })}
                aria-invalid={timesBackwards || undefined}
                
              />
            </Field>
          </div>
          <p className="mt-1 text-xs text-gray-05 text-pretty">
            {timesBackwards
              ? "The end time must be after the start time."
              : "Optional. A school that publishes only morning and afternoon can leave these empty."}
          </p>

          {/* The split, stated. A school meets both halves of it in one
              afternoon, and being stopped once but not the other time is how
              somebody concludes the rules are arbitrary. */}
          <div className="mt-5 rounded-lg border border-white-02 bg-white-05 px-3 py-2.5">
            <p className="text-xs text-gray-06 text-pretty">
              A room used twice, or one invigilator in two rooms, will save with
              a warning: two classes really can sit in one hall, and one person
              really does float between rooms. A class sitting two papers at
              once will be refused, because that one is impossible.
            </p>
          </div>

          {refusal && !refusal.field && (
            <p className="mt-4 text-xs text-error-text text-pretty">
              {refusal.message}
            </p>
          )}
          <ClashPreview
            warnings={clash.warnings}
            refusal={clash.refusal}
            asking={clash.asking}
            acknowledged={clash.acknowledged}
            onAcknowledge={clash.setAcknowledged}
            confirmLabel="I know, schedule it anyway. The timetable cannot be published until it is resolved."
          />
        </ScrollArea>

        <div className="shrink-0 border-t border-white-02 pt-4">
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
              Remove paper
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {/* Live even when the draft is incomplete: pressing it is how a
              reader finds out what is missing. */}
          {/* Quiet on an unacknowledged clash, and on a refusal the server
              will not accept however the form is filled. Both reasons are on
              screen directly above it. */}
          <Button onClick={save} disabled={saving || clash.blocked || !!clash.refusal}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save changes" : "Add paper"}
          </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
