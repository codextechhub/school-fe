// ─────────────────────────────────────────────────────────────────────────────
// Shapes returned by the three calendar prefixes:
//
//   /v1/academics/calendar/    events, and the reads behind the hub
//   /v1/academics/timetable/   rooms, bells, class grids, teacher grids
//   /v1/academics/exams/       exam periods and their papers
//
// Four rules from the backend's serializers run through all of them, and the
// types state them rather than leaving a reader to discover them:
//
//   1. The branch dimension RECEDES at a single-branch school. `branch`,
//      `branch_name` and `scope_label` are dropped from the payload entirely,
//      not nulled, so all three are optional. Absent means "this school has one
//      branch", never "no branch set". `Room` is the exception: a room is a
//      physical place, so its branch is never null, only ever absent.
//
//   2. A null `branch` on a row that HAS the field means school-wide. It is a
//      first-class value, never "nobody filled this in".
//
//   3. A person is `{id, name}` and never an email address. A class timetable
//      is the most widely read document a school produces.
//
//   4. A clash is a WARNING beside a row that was written, not a refusal. It
//      travels in `warnings`, the write succeeded, and only publishing is
//      blocked while it stands.
// ─────────────────────────────────────────────────────────────────────────────

/** Present on a row at a multi-branch school; absent otherwise. */
export interface Scoped {
  /** Null means school-wide. Absent means the school has one branch. */
  branch?: number | null;
  branch_name?: string | null;
  /** "School-wide", or the branch's name. */
  scope_label?: string;
  /**
   * False when the viewer may read this row but not change it: a branch
   * administrator looking at a row shared across the school. Absent reads as
   * changeable.
   */
  can_manage?: boolean;
}

/** A teacher or an invigilator, as every screen here renders one. */
export interface Person {
  id: number;
  name: string;
}

/**
 * One clash, as every write and every grid read returns it.
 *
 * `detail` is written by the server for the person reading it and is rendered
 * verbatim under the control that caused it. The client never composes a clash
 * sentence of its own. `slot_ids` is what lets a grid flag BOTH cells, and it
 * only ever carries ids the caller may already see.
 */
export interface ClashWarning {
  code: string;
  detail: string;
  slot_ids: number[];
}

/** A response that carried a row plus something to say about it. */
export type WithWarnings<T> = T & { warnings?: ClashWarning[] };

// ── Calendar events ──────────────────────────────────────────────────────────

export type EventType =
  | "HOLIDAY"
  | "MIDTERM_BREAK"
  | "EXAM_PERIOD"
  | "SCHOOL_EVENT"
  | "PTA"
  | "SPORTS";

/**
 * Who an event covers, when it covers only some of its branch.
 *
 * **Absent means everybody**, which is the default and the common case. It is
 * never an empty list: "Applies to: none" is the opposite of what no rows mean.
 * A level covers every class under it, which is what a school means by "the
 * whole of JSS1".
 */
export interface EventAudience {
  type: "level" | "class";
  id: number;
  name: string;
}

export interface CalendarEvent extends Scoped {
  id: number;
  name: string;
  event_type: EventType;
  type_label: string;
  start_date: string;
  end_date: string;
  /** Marks these days non-teaching. It does NOT delete that day's lessons. */
  closes_school: boolean;
  description: string;
  /** Null is a real answer the screen renders as "Outside every term". */
  term: { id: number; name: string } | null;
  /** Absent means the event covers everybody in its branch scope. */
  audience?: EventAudience[];
}

export interface CalendarEventWrite {
  name: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  closes_school?: boolean;
  description?: string;
  /** Null is school-wide. Omit entirely at a single-branch school. */
  branch?: number | null;
  /** Omit or send `[]` for an event that covers everybody. */
  audience?: { type: "level" | "class"; id: number }[];
}

export interface EventListArgs {
  branch?: number | "all";
  session?: number;
  search?: string;
  /** An event type, or "all". */
  type?: EventType | "all";
  /** A term id, or "all". A term is a date range, so this filters on dates. */
  term?: number | "all";
  /** A branch id, or "school" for school-wide rows only, or "all". */
  scope?: number | "school" | "all";
  /** Both inclusive, `YYYY-MM-DD`. The month grid asks with these. */
  from?: string;
  to?: string;
  page?: number;
}

// ── The reads behind the hub and the term view ───────────────────────────────

export type SessionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type TermState = "completed" | "ongoing" | "pending";

export interface CalendarSession {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: SessionStatus;
}

export interface TimelineTerm {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  state: TermState;
}

/**
 * The school year as a timeline.
 *
 * `{}` when the school has not started a year: a 200 with nothing, because a
 * school that has not opened its first session is not a school with a broken
 * calendar.
 */
export interface CalendarYear {
  session?: CalendarSession & {
    /** An archived year is read-only on every screen in this module. */
    read_only: boolean;
  };
  terms?: TimelineTerm[];
  on?: string;
}

export interface CalendarCurrent {
  session?: CalendarSession;
  term?: { id: number; name: string; start_date: string; end_date: string } | null;
  on?: string;
}

export type AlertCode =
  | "SESSION_HAS_NO_TERMS"
  | "EVENT_OUTSIDE_ANY_TERM"
  | "TERM_OUTSIDE_SESSION"
  | "TERM_DATES_OVERLAP"
  | "TIMETABLE_HAS_CLASHES"
  | "CLASS_HAS_NO_TIMETABLE";

export interface CalendarAlert {
  code: AlertCode;
  /** Written by the server, rendered verbatim. */
  detail: string;
  /** The rows it is about, so a screen can link to them. */
  ids: number[];
}

export interface UpcomingEvent {
  id: number;
  name: string;
  event_type: EventType;
  type_label: string;
  start_date: string;
  end_date: string;
  /** Negative for something already running. */
  days_away: number;
}

/** `{}` when the school has not started a year. */
export interface CalendarOverview {
  session?: CalendarSession;
  term?: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    days_elapsed: number;
    days_total: number;
    /** The half `closes_school` exists for: closed days do not count. */
    teaching_days_elapsed: number;
    teaching_days_total: number;
  } | null;
  counts?: {
    terms: number;
    events_in_term: number;
    /**
     * Classes holding at least one lesson. Never a count of FINISHED grids:
     * nothing knows how many periods a subject should get, so a full grid is
     * not necessarily right and one with gaps is not necessarily wrong.
     */
    classes_timetabled: number;
    rooms: number;
  };
  next_up?: UpcomingEvent[];
  alerts?: CalendarAlert[];
}

// ── Rooms ────────────────────────────────────────────────────────────────────

export type RoomType =
  | "CLASSROOM"
  | "LABORATORY"
  | "HALL"
  | "LIBRARY"
  | "SPORTS"
  | "OTHER";

export interface Room {
  id: number;
  /**
   * False when the viewer may read this row but not change it: a branch
   * administrator looking at a row shared across the school. Absent reads as
   * changeable.
   */
  can_manage?: boolean;
  name: string;
  code: string;
  room_type: RoomType;
  type_label: string;
  /**
   * Never null: a room is a physical place and a place is at one branch. Absent
   * at a single-branch school, like every other branch field here.
   */
  branch?: number;
  branch_name?: string;
  /** Advisory. Nothing anywhere compares it with anything. */
  capacity: number | null;
  is_active: boolean;
  /** What is scheduled here. The delete refusal is worded from these counts. */
  usage: {
    lessons: number;
    exam_papers: number;
    /** "3 lessons · 1 exam paper", or "Nothing scheduled here yet". */
    label: string;
  };
}

export interface RoomWrite {
  name: string;
  code?: string;
  room_type: RoomType;
  /** Required at a multi-branch school; omit at a single-branch one. */
  branch?: number;
  capacity?: number | null;
  is_active?: boolean;
}

export interface RoomListArgs {
  branch?: number | "all";
  search?: string;
  type?: RoomType;
  /** Omitted means every status, which is what the design's default shows. */
  active?: "true" | "false";
  page?: number;
}

// ── The bell schedule ────────────────────────────────────────────────────────

export type PeriodType = "LESSON" | "BREAK" | "LUNCH" | "ASSEMBLY";

/** ISO-8601, so it agrees with the server without a conversion. */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Period extends Scoped {
  id: number;
  label: string;
  /** Computed from the times by the server. Never sent. */
  order_index: number;
  start_time: string;
  end_time: string;
  period_type: PeriodType;
  type_label: string;
  /** Null means every teaching day. */
  day_of_week: DayOfWeek | null;
  /** "Every day", or the weekday's name. */
  day_label: string;
  is_active: boolean;
}

export interface PeriodWrite {
  label: string;
  start_time: string;
  end_time: string;
  period_type: PeriodType;
  /** Null or omitted means every day. */
  day_of_week?: DayOfWeek | null;
  branch?: number | null;
  is_active?: boolean;
}

/**
 * The bell schedule, unpaginated: a school day is a dozen rows, and paginating
 * it would make a client reassemble a schedule it asked for whole.
 *
 * Asking for one `day` does not filter on the column. It returns the periods in
 * FORCE that weekday, which is different: a day with rows of its own runs only
 * those and the everyday schedule does not apply at all. `note` is the sentence
 * that says so, written by the server.
 */
export interface BellSchedule {
  day: DayOfWeek | null;
  day_label?: string;
  has_own_schedule?: boolean;
  note?: string;
  periods: Period[];
}

export interface PeriodListArgs {
  branch?: number | "all";
  session?: number;
  /** A weekday, or "all" for the whole table. */
  day?: DayOfWeek | "all";
  is_active?: "all" | "false";
}

// ── Class timetables ─────────────────────────────────────────────────────────

export type PublishState = "DRAFT" | "PUBLISHED";

/**
 * Three states, and the third is an absent row.
 *
 * A class whose grid has never been touched has no record at all, so `status`
 * is null and the label is "Not started". A DRAFT default would quietly destroy
 * that distinction.
 */
export interface TimetableStatus {
  status: PublishState | null;
  status_label: string;
  published_at: string | null;
}

export interface ClassTimetableRow extends Scoped, TimetableStatus {
  id: number;
  name: string;
  lesson_count: number;
  /** Tenant-wide: a clash with another branch is still a clash. */
  has_clash: boolean;
}

export interface TimetableSlot {
  id: number;
  /**
   * False when the viewer may read this row but not change it: a branch
   * administrator looking at a row shared across the school. Absent reads as
   * changeable.
   */
  can_manage?: boolean;
  school_class: number;
  class_name: string;
  day_of_week: DayOfWeek;
  period: number;
  period_label: string;
  subject: number;
  subject_name: string;
  /** Null while a school fills the subjects before it fills the people. */
  teacher: Person | null;
  room: number | null;
  room_name: string | null;
  /** Only on a teacher's grid, where a class may sit at another branch. */
  branch_name?: string;
}

/**
 * A cell is a period, and either a lesson slot or something that is not one.
 *
 * **The two grids do not send identical cells, and the optional fields are
 * where they differ.** A class's grid carries the period times and reports its
 * clashes once at grid level; a teacher's grid omits the times and hangs the
 * warnings on the cells themselves. Typing either as required would be a lie
 * about the other, and the one that bites is `start_time`: reading `.slice()`
 * off an absent value is a crash, not a blank.
 */
export interface GridCell {
  period: number;
  period_label: string;
  /** Absent on a teacher's grid. */
  start_time?: string;
  end_time?: string;
  kind: PeriodType;
  /** On a non-LESSON cell only: "Break", "Lunch", "Assembly". */
  label?: string;
  /** On a LESSON cell only. Null is an empty slot to be filled. */
  slot?: TimetableSlot | null;
  /** Per cell on a teacher's grid. A class's grid reports them grid-level. */
  warnings?: ClashWarning[];
}

export interface GridDay {
  day_of_week: DayOfWeek;
  day_label: string;
  /**
   * False on a day the school no longer teaches that still holds a lesson.
   * The server draws it so the lesson can be seen and cleared; it still counts
   * in clashes and at the publish gate. Absent reads as a teaching day.
   */
  is_teaching_day?: boolean;
  cells: GridCell[];
}

export interface ClassTimetable extends TimetableStatus {
  school_class: { id: number; name: string };
  session: { id: number; name: string };
  /** False is the whole blocking empty state: a grid is built on periods. */
  has_bell_schedule: boolean;
  days: GridDay[];
  /**
   * Counts carrying no expectation. There is no percentage and no "complete"
   * flag, because nothing knows how many periods a subject should get.
   */
  filled: number;
  lesson_periods: number;
  /** Flag both cells of each clash with `slot_ids`. */
  warnings: ClashWarning[];
}

export interface SlotWrite {
  school_class: number;
  day_of_week: DayOfWeek;
  period: number;
  subject: number;
  teacher?: number | null;
  room?: number | null;
}

/**
 * What duplicating a week would do, or did.
 *
 * `skipped` is a source lesson sitting in a period the target class does not
 * run, which is why the preview is computed on the server: two clients would
 * decide that differently.
 */
export interface DuplicateRow {
  /** ISO weekday, not a label: the client renders the name it wants. */
  day_of_week: DayOfWeek;
  /** The period's label, e.g. "Period 1". */
  period: string;
  subject: string;
  /** "No teacher" when the copy is dropping them, never null. */
  teacher: string;
  /** "No room" when the copy is dropping them, never null. */
  room: string;
}

export interface DuplicateSummary {
  source_class: string;
  target_class: string;
  copied: number;
  skipped: number;
  /** How many rows already in the TARGET would be wiped. Not "overwritten by
   *  name": the whole target week is replaced, so this counts all of it. */
  replaced: number;
  rows: DuplicateRow[];
  /** A source lesson in a period the target does not run. Carries no teacher
   *  or room, because nothing about it is being copied. */
  skipped_rows: Pick<DuplicateRow, "day_of_week" | "period" | "subject">[];
  /**
   * Copied lessons whose teacher has no teaching duty for the target class,
   * under the school's WARN. Under REFUSE the copy is refused instead.
   */
  warnings?: ClashWarning[];
}

export interface DuplicateArgs {
  /** The class being written into. */
  id: number;
  source_class: number;
  /** Off copies the subjects only. Copied teachers may create clashes. */
  keep_teachers?: boolean;
  /** Two classes cannot share a room, so this usually needs changing after. */
  keep_rooms?: boolean;
}

// ── Teacher timetables ───────────────────────────────────────────────────────

export interface TeacherRow {
  id: number;
  name: string;
  lesson_count: number;
  has_clash: boolean;
}

export interface TeacherTimetable {
  teacher: Person;
  session: { id: number; name: string };
  days: GridDay[];
  summary: {
    /** Plain counts. No threshold, no colour, no comparison. */
    teaching_periods: number;
    free_periods: number;
    busiest_day: string | null;
    /** Only at a multi-branch school, and only if they work at more than one. */
    branches?: string[];
  };
  /** Always true. A teacher's week is derived; edits happen on the class grid. */
  read_only: boolean;
}

// ── Exams ────────────────────────────────────────────────────────────────────

export type Sitting = "MORNING" | "AFTERNOON";

export interface ExamSlot {
  id: number;
  /**
   * False when the viewer may read this row but not change it: a branch
   * administrator looking at a row shared across the school. Absent reads as
   * changeable.
   */
  can_manage?: boolean;
  school_class: number;
  class_name: string;
  subject: number;
  subject_name: string;
  exam_date: string;
  sitting: Sitting;
  sitting_label: string;
  /** A school publishing only morning and afternoon is not made to invent these. */
  start_time: string | null;
  end_time: string | null;
  room: number | null;
  room_name: string | null;
  invigilator: Person | null;
}

/**
 * An exam timetable, hanging off a dated exam period on the calendar.
 *
 * The dates are the EVENT's and are not copied: the school says in its calendar
 * that it is examining in the first week of December, and this hangs off that
 * statement.
 */
export interface Exam {
  id: number;
  /**
   * False when the viewer may read this row but not change it: a branch
   * administrator looking at a row shared across the school. Absent reads as
   * changeable.
   */
  can_manage?: boolean;
  name: string;
  calendar_event: number;
  event_name: string;
  start_date: string;
  end_date: string;
  status: PublishState;
  status_label: string;
  published_at: string | null;
  slots: ExamSlot[];
  /**
   * A room used twice and an invigilator in two rooms both WARN, because a
   * school legitimately does both. A class sitting two papers at once is
   * refused outright, so it never appears here.
   */
  warnings: ClashWarning[];
  paper_count: number;
}

export interface ExamSlotWrite {
  school_class: number;
  subject: number;
  exam_date: string;
  sitting: Sitting;
  start_time?: string | null;
  end_time?: string | null;
  room?: number | null;
  invigilator?: number | null;
}

// ── The school's calendar and timetable rules ────────────────────────────────

/**
 * How strictly a lesson's teacher has to match the class and subject they hold
 * in Teaching duties.
 *
 *   OFF     anyone may take any lesson, and nothing is said.
 *   WARN    a mismatch saves with a warning, and the publish check lists it.
 *   REFUSE  a mismatch is refused on save and blocks publishing.
 */
export type TeacherDutyMatch = "OFF" | "WARN" | "REFUSE";

export interface RuleOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * The school's rules for its calendar, timetables and exams.
 *
 * Readable by every signed-in member, because every calendar and date picker
 * draws its week from `week_starts_on`. Weekdays are ISO numbers throughout:
 * 1 is Monday and 7 is Sunday, the same numbering `DayOfWeek` uses.
 *
 * Each is a default or a check on what happens next. Nothing already on the
 * calendar, and no published timetable, changes when these do.
 */
export interface CalendarRules {
  /** ISO weekdays lessons happen on. Timetables show these days. */
  teaching_days: number[];
  /** ISO weekday: 1 is Monday, 7 is Sunday. */
  week_starts_on: number;
  /** Whether a new event of each type starts out closing the school. */
  closes_school_by_type: Record<string, boolean>;
  /** Every event type, labelled in the school's own words. */
  event_types: RuleOption[];
  /** False when a lesson publishes once it has a teacher, room or not. */
  room_required_to_publish: boolean;
  teacher_duty_match: TeacherDutyMatch;
  teacher_duty_match_options: RuleOption[];
  /** Role keys whose holders may invigilate an exam paper. */
  invigilator_roles: string[];
  invigilator_role_options: RuleOption[];
  /** The length a new period starts with. Null means type both times. */
  default_period_minutes: number | null;
}

/** A change to the rules. Needs settings rights and whole-school reach. */
export interface CalendarRulesUpdate {
  teaching_days: number[];
  week_starts_on: number;
  closes_school_by_type: Record<string, boolean>;
  room_required_to_publish: boolean;
  teacher_duty_match: TeacherDutyMatch;
  invigilator_roles: string[];
  default_period_minutes: number | null;
  /** Kept on the audit record. */
  reason?: string;
}

/**
 * Somebody who may invigilate an exam paper.
 *
 * Eligibility comes from the school's `invigilator_roles`, so a bursar can be
 * on this list at one school and absent at another. `role_label` says which of
 * their roles made them eligible, because two people called Eze are told apart
 * by what they do.
 */
export interface Invigilator extends Person {
  /** The eligible roles this person holds, joined: "Teacher, Lab technician". */
  role_label: string;
}

/**
 * Copy an earlier session's bell schedule into one that has none.
 *
 * `session` is the year being filled, sent the same way as every other lens.
 * The server refuses a target that already holds periods, with a sentence.
 */
export interface CopyBellScheduleArgs {
  from_session: number;
  session: number;
}

/** What a bell copy wrote: how many periods, and the periods themselves. */
export interface CopyBellScheduleResult {
  copied: number;
  periods: Period[];
  /**
   * Day-specific periods left out because the school no longer teaches that
   * day. The envelope's message says so in a sentence.
   */
  skipped?: { name: string; day_of_week: number; day_label: string }[];
}

/**
 * What a successful publish answers with. `warnings` lists the lessons
 * published under the school's WARN whose teacher has no teaching duty for
 * them, and is empty otherwise.
 */
export type PublishResult = TimetableStatus & { warnings: ClashWarning[] };
