import type {
  PromotionOutcome,
  PromotionPlan,
} from "@/redux/services/students/students-types";

export type PromotionCounts = Record<Lowercase<PromotionOutcome>, number>;

/** Returns the decision currently shown for one student. */
export function outcomeFor(
  student: PromotionPlan["students"][number],
  overrides: Record<string, PromotionOutcome>,
) {
  return overrides[String(student.id)] ?? student.outcome;
}

/** Counts the visible decisions while the user reviews local overrides. */
export function reviewCounts(
  plan: PromotionPlan,
  overrides: Record<string, PromotionOutcome>,
): PromotionCounts {
  const counts: PromotionCounts = {
    promote: 0,
    repeat: 0,
    graduate: 0,
    hold: 0,
  };
  for (const student of plan.students) {
    const outcome = outcomeFor(student, overrides).toLowerCase() as keyof PromotionCounts;
    counts[outcome] += 1;
  }
  return counts;
}
