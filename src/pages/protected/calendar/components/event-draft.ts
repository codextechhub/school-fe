import type {
  CalendarEvent,
  EventType,
} from "@/redux/services/calendar/calendar-types";
import type { AudiencePick } from "./audience";
import { toPicks } from "./audience";

// The event form's own shape, and the two ways of filling it in. Split from the
// drawer so the screens can build a draft without importing a form.

export interface EventDraft {
  name: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  closes_school: boolean;
  description: string;
  /** Null is school-wide. -1 means "one branch" chosen with none named yet. */
  branch: number | null;
  audience: AudiencePick[];
}

/**
 * A blank event.
 *
 * Seeded with the branch currently in the lens, because a reader who has
 * narrowed to Lekki and pressed Add is adding a Lekki event. `null` when the
 * lens is on all branches, which is school-wide and the common case.
 */
export function blankEvent(branch: number | null): EventDraft {
  return {
    name: "",
    event_type: "HOLIDAY",
    start_date: "",
    end_date: "",
    closes_school: false,
    description: "",
    branch,
    audience: [],
  };
}

export function draftFrom(event: CalendarEvent): EventDraft {
  return {
    name: event.name,
    event_type: event.event_type,
    start_date: event.start_date,
    end_date: event.end_date,
    closes_school: event.closes_school,
    description: event.description ?? "",
    branch: event.branch ?? null,
    audience: toPicks(event.audience),
  };
}

/**
 * Whether the "school closed" box reads ticked.
 *
 * A new event takes the school's default for its type (`closes_school_by_type`
 * in the calendar rules), and follows it as the type changes, until the person
 * ticks or clears the box in this drawer themselves. An event being edited
 * always keeps its own answer: a school changing its defaults has not changed
 * what last October's holiday was. A type the rules do not mention keeps
 * whatever the box already says.
 */
export function closesSchoolShown({
  editing,
  chosen,
  eventType,
  byType,
  value,
}: {
  editing: boolean;
  /** True once the person has changed the box in this drawer. */
  chosen: boolean;
  eventType: EventType;
  byType: Record<string, boolean>;
  value: boolean;
}): boolean {
  if (editing || chosen) return value;
  return byType[eventType] ?? value;
}
