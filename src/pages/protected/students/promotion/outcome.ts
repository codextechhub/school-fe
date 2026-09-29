import type {
  PromotionOutcome,
  PromotionPlan,
} from "@/redux/services/students/students-types";

/**
 * The four outcomes, spelled one way.
 *
 * They appear on the review buttons, the confirm tiles and the done panel, and
 * a student shown "Held" on one and "Hold" on the next reads as two states
 * rather than one. Keyed on the server's code, never on a label.
 */
export const OUTCOME: Record<
  PromotionOutcome,
  { label: string; chip: string; on: string }
> = {
  PROMOTE: {
    label: "Promote",
    chip: "bg-green-700/10 text-green-800",
    on: "bg-green-700 text-white",
  },
  REPEAT: {
    label: "Repeat",
    chip: "bg-amber-500/10 text-amber-700",
    on: "bg-amber-500 text-white",
  },
  GRADUATE: {
    label: "Graduate",
    chip: "bg-primary/10 text-primary",
    on: "bg-primary text-white",
  },
  HOLD: {
    label: "Hold",
    chip: "bg-gray-500/10 text-gray-600",
    on: "bg-gray-500 text-white",
  },
};

export const OUTCOMES: PromotionOutcome[] = [
  "PROMOTE",
  "REPEAT",
  "GRADUATE",
  "HOLD",
];


/** The short cause labels. The full sentence stays on the exception list. */
const CAUSE_LABEL: Record<string, string> = {
  NO_CLASS_AT_NEXT_LEVEL: "No class there yet",
  LEVEL_NOT_WIRED: "No target set for this level",
  NO_CLASS_TO_REPEAT: "Nowhere to repeat",
  NO_CLASS_ASSIGNED: "No class to promote from",
};

/** A level map row, as far as the destination needs it. */
interface DestinationRow {
  from?: string;
  to: string | null;
  to_classes?: { name: string }[];
  terminal: boolean;
  from_id: number;
  arm_fallback?: boolean;
  arm_note?: string | null;
}

/**
 * Why a class that keeps its arms is being shared out, or null when it is not.
 *
 * Under the "keep the arm" rule JSS1 A moves up to JSS2 A. When next year has
 * no JSS2 A, the server shares the class across JSS2's classes rather than
 * holding it back, and a registrar reading "JSS2 B, JSS2 C" beside JSS1 A
 * needs to be told why the arm did not carry. The server's own sentence is
 * used when it sends one.
 */
export function armFallbackNote(row: DestinationRow): string | null {
  if (!row.arm_fallback) return null;
  const note = row.arm_note?.trim();
  if (note) return note;
  const targets = row.to_classes?.map((c) => c.name) ?? [];
  const across = targets.length > 1 ? targets.join(", ") : "the next level's classes";
  const source = row.from ? `${row.from}'s` : "this class's";
  return `No class at the next level has ${source} arm, so these students are shared across ${across}.`;
}

/**
 * What to print where a class is going, and it is not ours to invent.
 *
 * A null target has more than one cause and they need different actions: the
 * level may have no next level wired (fix the level), or the target year may
 * have no class at that level yet (copy the year forward). One wording for
 * both told a registrar to set a promotion target that was already set, while
 * the exception list on the same screen said the opposite.
 *
 * Shared by the class map and the review headers, because two screens deriving
 * this separately is how they came to disagree in the first place.
 *
 * Under the school's "spread across the arms" rule one class lands in several,
 * and the label names them all; each student's own line says which one.
 */
export function destinationOf(
  plan: PromotionPlan,
  row: DestinationRow,
): { label: string; tone: string; note: string | null } {
  const note = armFallbackNote(row);
  // A school that spreads a year group sends one class into several.
  if (row.to_classes && row.to_classes.length > 1) {
    return {
      label: `Spread: ${row.to_classes.map((c) => c.name).join(", ")}`,
      tone: "text-black-01",
      note,
    };
  }
  if (row.to) return { label: row.to, tone: "text-black-01", note };
  if (row.terminal) return { label: "Graduates", tone: "text-primary", note: null };
  const cause = plan.exceptions.by_class.find((e) => e.class === row.from_id);
  return {
    label: (cause && CAUSE_LABEL[cause.cause]) ?? "Not moving up",
    tone: "text-amber-700",
    note: null,
  };
}
