import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PromotionOutcome,
  PromotionPlan,
} from "@/redux/services/students/students-types";

import { PersonAvatar } from "../person-avatar";
import { outcomeFor, reviewCounts } from "./promotion-model";
import { OUTCOME, OUTCOMES, destinationOf } from "./outcome";

/**
 * Candidate students grouped by the class they are leaving.
 *
 * Groups stay collapsed until opened so large schools do not render hundreds
 * of decision controls at once. The class filter opens its selected group and
 * hides the rest, matching the focused inner layer in the approved design.
 */
export function ClassGroups({
  plan,
  overrides,
  classFilter,
  onSetStudent,
  onSetClass,
}: {
  plan: PromotionPlan;
  overrides: Record<string, PromotionOutcome>;
  classFilter: string;
  onSetStudent: (studentId: number, outcome: PromotionOutcome) => void;
  onSetClass: (classId: number, outcome: PromotionOutcome) => void;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const groups = useMemo(
    () =>
      plan.level_map
        .map((row) => ({
          ...row,
          students: plan.students.filter((student) => student.from_class_id === row.from_id),
        }))
        .filter((group) => group.students.length > 0)
        .filter((group) => classFilter === "all" || String(group.from_id) === classFilter),
    [classFilter, plan],
  );

  if (groups.length === 0) {
    return (
      <Panel
        as="section"
        data-guide="promotion.class-groups"
        className="px-4 py-10 text-center text-sm text-gray-05"
      >
        No student in this year is a candidate for promotion.
      </Panel>
    );
  }

  return (
    <div data-guide="promotion.class-groups" className="grid min-w-0 gap-3">
      {groups.map((group) => {
        const isOpen = classFilter !== "all" || Boolean(open[group.from_id]);
        const tally = reviewCounts({ ...plan, students: group.students }, overrides);
        const tallyLine = OUTCOMES.filter((outcome) => tally[outcome.toLowerCase() as keyof typeof tally])
          .map((outcome) => {
            const count = tally[outcome.toLowerCase() as keyof typeof tally];
            return `${count} ${OUTCOME[outcome].label.toLowerCase()}`;
          })
          .join(" · ");
        const destination = destinationOf(plan, group);

        return (
          <Panel as="section" key={group.from_id} className="min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setOpen((current) => ({ ...current, [group.from_id]: !isOpen }))
              }
              aria-expanded={isOpen}
              className={cn(
                "flex w-full min-w-0 flex-wrap items-center gap-3 p-4 text-left",
                "transition-colors hover:bg-white-03 active:bg-pry-01",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                isOpen && "border-b border-primary bg-pry-01",
              )}
            >
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-gray-05 transition-transform duration-200",
                  isOpen && "rotate-180 text-primary",
                )}
              />
              <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <strong className="truncate font-semibold text-black-01">{group.from}</strong>
                <ArrowRight className="size-3.5 shrink-0 text-gray-05" />
                <span className={`truncate ${destination.tone}`}>{destination.label}</span>
                {group.terminal && (
                  <span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline-flex">
                    Terminal
                  </span>
                )}
              </span>
              <span className="ml-7 text-xs text-gray-05 sm:ml-0">
                {tallyLine} · {group.students.length} {group.students.length === 1 ? "student" : "students"}
              </span>
              {destination.note && (
                <span className="ml-7 basis-full text-xs text-amber-700 text-pretty">
                  {destination.note}
                </span>
              )}
            </button>

            {isOpen && (
              <div>
                <div className="flex flex-wrap items-center gap-2 border-b border-white-02 bg-white-03 px-4 py-2.5">
                  <span className="text-xs text-gray-05">Set the whole class</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onSetClass(group.from_id, group.terminal ? "GRADUATE" : "PROMOTE")
                    }
                  >
                    All {group.terminal ? "graduate" : "up"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSetClass(group.from_id, "HOLD")}
                  >
                    All held
                  </Button>
                </div>

                <ul className="divide-y divide-white-02">
                  {group.students.map((student) => {
                    const current = outcomeFor(student, overrides);
                    return (
                      <li
                        key={student.id}
                        className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3"
                      >
                        <PersonAvatar name={student.name} className="size-9" textClassName="text-[11px]" />
                        <div className="min-w-0 flex-1 basis-44">
                          <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-black-01">
                            <span className="truncate">{student.name}</span>
                            {student.suspended && (
                              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                Suspended
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-gray-05">
                            {student.student_number || "No admission number"}
                            {student.to_class ? ` · into ${student.to_class}` : ""}
                          </p>
                        </div>
                        <div
                          className="ml-12 flex max-w-full flex-wrap gap-1.5 sm:ml-0"
                          aria-label={`Promotion outcome for ${student.name}`}
                        >
                          {OUTCOMES.map((outcome) => (
                            <button
                              key={outcome}
                              type="button"
                              aria-pressed={current === outcome}
                              onClick={() => onSetStudent(student.id, outcome)}
                              className={cn(
                                "rounded-md border px-3 py-1.5 text-xs transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                current === outcome
                                  ? `${OUTCOME[outcome].on} border-transparent`
                                  : "border-border bg-white text-gray-05 hover:border-primary/40 hover:text-black-01",
                              )}
                            >
                              {OUTCOME[outcome].label}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
