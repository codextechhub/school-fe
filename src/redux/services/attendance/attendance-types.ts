/**
 * The attendance API's shapes, as `/v1/attendance/` sends them.
 *
 * Every key a Field Access switch governs is optional, because the backend
 * leaves a hidden field out of the response rather than sending it blank, and
 * leaves a whole block out when the caller may not read what it is made of.
 * A screen reads a missing key as "hidden" and removes the column or section.
 */

/** A child's mark on one day. Late counts as present and is also counted alone. */
export type AttendanceMark = "P" | "L" | "A" | "E";

/** What became of the absence email to the primary guardian. */
export type NoticeState = "NONE" | "SENT" | "NO_EMAIL" | "NOTICES_OFF";

export type RegisterStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "READY"
  | "SUBMITTED"
  | "CLOSED_DAY";

/** Why a day has no register: a calendar closure, or a day the school does not teach. */
export interface ClosedDay {
  reason: string;
  code: string;
}

export interface BranchRef {
  id: number;
  name: string;
}

export interface StudentRef {
  id: number;
  name: string;
  student_number: string;
}

/** The query every day-scoped read takes. Omitted date means today at the school. */
export interface DayArgs {
  date?: string;
  branch?: number | "all";
}

// ── Today, the administrator's hub ─────────────────────────────────────────

export interface HubKpis {
  /** Present and late over everyone marked, as a percentage; null before any register. */
  rate: number | null;
  absent: number;
  late: number;
  excused: number;
  not_taken: number;
  /** Present only when a class in scope marks lessons and the caller may read lesson counts. */
  missed_a_lesson?: number;
  /** Present only for a caller who decides corrections. */
  corrections_waiting?: number;
}

export interface NotTakenRow {
  class_id: number;
  class_name: string;
  level_name: string;
  class_teacher_name: string | null;
  branch: BranchRef | null;
  reminded: boolean;
}

export interface HubAbsentRow {
  student: StudentRef;
  class_name: string;
  mark?: AttendanceMark;
  reason_code?: number | null;
  reason_label?: string | null;
  note?: string;
  notice_state?: NoticeState;
  notice_sent_at?: string | null;
}

export interface MissedLessonRow {
  student: StudentRef;
  class_name: string;
  period_label: string;
  subject: string;
  lesson_submitted_at: string;
  morning_mark?: AttendanceMark | null;
}

export interface CorrectionRow {
  id: number;
  student: StudentRef;
  class_id: number;
  class_name: string;
  branch: BranchRef | null;
  date: string;
  from_mark?: AttendanceMark;
  to_mark?: AttendanceMark;
  arrived_at?: string | null;
  reason_code?: number | null;
  reason_label?: string | null;
  note?: string;
  requested_by_name?: string;
  requested_at?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  decided_by_name?: string;
  decided_at?: string | null;
  decision_note?: string;
  is_mine: boolean;
}

export interface AdminHub {
  date: string;
  date_label: string;
  closed: ClosedDay | null;
  /** Absent when the caller may not read register counts. */
  kpis?: HubKpis;
  /** Absent when the caller may not read register status. */
  not_taken?: NotTakenRow[];
  absent: HubAbsentRow[];
  pending_corrections_preview: CorrectionRow | null;
  /** True at a school with several branches: the tables show a Branch column, otherwise Level. */
  branch_dimension: boolean;
  /** Classes that cannot take a register until they are given a branch. */
  classes_without_branch: string[];
  /** Present only when a class in scope marks lessons. */
  missed_lessons?: MissedLessonRow[];
}

// ── Today, a teacher's own registers ───────────────────────────────────────

export interface TeacherClassCard {
  class_id: number;
  class_name: string;
  student_count?: number;
  status?: RegisterStatus;
  submitted_at?: string | null;
  submitted_by_name?: string | null;
}

export interface TeacherLessonCard {
  slot_id: number;
  period_label: string;
  start_time: string;
  subject: string;
  class_name: string;
  status?: RegisterStatus;
  submitted_at?: string | null;
}

export interface TeacherHub {
  date: string;
  date_label: string;
  closed: ClosedDay | null;
  classes: TeacherClassCard[];
  lesson_marking_on: boolean;
  lessons?: TeacherLessonCard[];
}

// ── A class's register for one day ─────────────────────────────────────────

/** Which register: a class and a day. The day is always sent, never defaulted. */
export interface RegisterKey {
  classId: number;
  date: string;
}

export interface RegisterRow {
  student_id: number;
  name: string;
  student_number: string;
  /** Suspended on this day: shown, never marked, counted nowhere. */
  locked: boolean;
  mark?: AttendanceMark | null;
  /** `HH:MM`, for a Late mark. */
  arrived_at?: string | null;
  reason_code?: number | null;
  reason_label?: string | null;
  note?: string;
  notice_state?: NoticeState;
  notice_sent_at?: string | null;
}

export interface RegisterCounts {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  unmarked: number;
  locked: number;
}

export interface TakenBy {
  submitted_by: string | null;
  submitted_at: string;
  /** The class teacher, when somebody else submitted it. */
  on_behalf_of: string | null;
  /** The class teacher's approved leave on the day, when they were away. */
  on_leave: { leave_type: string; leave_type_label: string; ends_on: string } | null;
}

export interface MarkChange {
  student_id: number;
  student_name: string;
  from_mark?: AttendanceMark | null;
  to_mark?: AttendanceMark;
  changed_by_name: string;
  changed_at: string;
  via: "SAME_DAY" | "CORRECTION";
  note?: string;
}

/** What submitting would do about guardian notices. Null once submitted. */
export interface SubmitPreview {
  notices_on: boolean;
  will_email: number;
  no_email: number;
}

export interface Register {
  school_class: {
    id: number;
    name: string;
    class_teacher_name: string | null;
    branch: BranchRef | null;
  };
  date: string;
  date_label: string;
  closed: ClosedDay | null;
  status?: RegisterStatus;
  /** Nobody is placed in the class on this day, so there is nothing to take. */
  roster_empty: boolean;
  counts?: RegisterCounts;
  taken_by?: TakenBy | null;
  /**
   * After submission: whether rows may still be changed in place (true) or
   * only through a correction request (false). Null before submission.
   */
  edit_window_open: boolean | null;
  rows: RegisterRow[];
  history: MarkChange[];
  submit_preview?: SubmitPreview | null;
}

/** The whole of one row, as a mark write sends it. */
export interface MarkWrite {
  mark: AttendanceMark;
  arrived_at?: string | null;
  reason_code?: number | null;
  note?: string;
}

export interface ReasonCode {
  id: number;
  name: string;
  counts_as_authorised: boolean;
  /** "Other" and any code like it: the note says what happened. */
  requires_note: boolean;
  retired: boolean;
  used_this_term?: number;
}

export interface CorrectionCreate {
  register_class_id: number;
  date: string;
  student_id: number;
  to_mark: AttendanceMark;
  reason_code: number;
  note?: string;
  arrived_at?: string | null;
}
