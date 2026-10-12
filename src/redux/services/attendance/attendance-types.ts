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

// ── Corrections ────────────────────────────────────────────────────────────

export interface CorrectionListArgs {
  status: "pending" | "decided";
  branch?: number | "all";
  page?: number;
  /** Leave out the reader's own requests: what is left is theirs to decide. */
  awaitingMe?: boolean;
}

export interface CorrectionDecision {
  id: number;
  approve: boolean;
  /** Kept on the student's record either way. */
  decision_note?: string;
}

// ── A student's Attendance tab ─────────────────────────────────────────────

/** What one day of a term was for this pupil. */
export type StudentDayState = "MARKED" | "NOT_TAKEN" | "CLOSED" | "SUSPENDED" | "NOT_ON_ROLL";

export interface StudentDay {
  date: string;
  state: StudentDayState;
  /** The class the pupil was placed in that day; null off the roll. */
  class_id: number | null;
  mark?: AttendanceMark | null;
  arrived_at?: string | null;
  closed_reason: string | null;
}

export interface TermRef {
  id: number;
  name: string;
  session_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface StudentCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  not_taken: number;
  /** Days the pupil was expected and the school was open. */
  opened: number;
  rate: number | null;
}

export interface StudentAbsence {
  date: string;
  class_name: string;
  mark?: AttendanceMark;
  reason_code?: number | null;
  reason_label?: string | null;
  note?: string;
  notice_state?: NoticeState;
  notice_sent_at?: string | null;
}

export interface StudentLessonAbsence {
  date: string;
  period_label: string;
  subject: string;
  morning_mark?: AttendanceMark | null;
}

/** A change made in place on the day, or a decided correction. */
export type StudentHistoryEntry =
  | {
      kind: "change";
      at: string;
      date: string;
      from_mark?: AttendanceMark | null;
      to_mark?: AttendanceMark;
      changed_by_name: string;
      via: "SAME_DAY" | "CORRECTION";
      note?: string;
    }
  | {
      kind: "correction";
      at: string;
      date: string;
      from_mark?: AttendanceMark;
      to_mark?: AttendanceMark;
      arrived_at?: string | null;
      status?: "APPROVED" | "REJECTED";
      via: "CORRECTION";
      reason_label?: string | null;
      note?: string;
      requested_by_name?: string;
      requested_at?: string;
      decided_by_name?: string;
      decided_at?: string;
      decision_note?: string;
    };

export interface StudentAttendance {
  student: {
    id: number;
    name: string;
    student_number: string;
    class_name: string | null;
    branch: BranchRef | null;
  };
  /** Absent when the reader may read neither the guardian's name nor email. */
  primary_guardian?: { name?: string; email?: string | null } | null;
  term: TermRef | null;
  terms: TermRef[];
  counts?: StudentCounts;
  days: StudentDay[];
  absences: StudentAbsence[];
  /** Present only where the pupil's level marks lessons and the reader may read lesson marks. */
  lesson_absences?: StudentLessonAbsence[];
  history: StudentHistoryEntry[];
}

// ── Attendance settings ────────────────────────────────────────────────────

/** One level of the active school year, and whether it marks every lesson. */
export interface SettingsLevel {
  code: string;
  name: string;
  program_id: number;
  program_name: string;
  lesson_marking: boolean;
  /** Lesson marking has nothing to mark until a class at the level has a published timetable. */
  has_published_timetable: boolean;
}

export interface AttendanceSettings {
  guardian_notices: boolean;
  /** A student below this rate, in percent, is on the chronic-absence list. */
  chronic_threshold: number;
  lesson_marking_levels: string[];
  /** How many days after its date a submitted register can still be changed in place. 0 is the same day only. */
  edit_window_days: number;
  levels: SettingsLevel[];
  scope_label: { school_name: string; session_name: string | null; term_name: string | null };
}

export type AttendanceSettingsWrite = Partial<
  Pick<AttendanceSettings, "guardian_notices" | "chronic_threshold" | "lesson_marking_levels" | "edit_window_days">
>;

export interface ReasonCodeWrite {
  name: string;
  requires_note?: boolean;
}

// ── Reports ────────────────────────────────────────────────────────────────

export interface ReportArgs {
  term?: number;
  branch?: number | "all";
}

export interface ReportClassCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number | null;
  not_taken: number;
  roster_size: number;
}

export interface Report {
  term: TermRef | null;
  terms: TermRef[];
  range: { start: string | null; end: string | null; school_days?: number };
  /** Absent with the register counts. A week with no register taken has a null rate. */
  trend?: { week_start: string; label: string; rate: number | null }[];
  by_class: {
    class_id: number;
    class_name: string;
    level_name: string;
    branch: BranchRef | null;
    counts?: ReportClassCounts;
  }[];
  by_level?: {
    level_name: string;
    present: number;
    late: number;
    absent: number;
    excused: number;
    not_taken: number;
    rate: number | null;
  }[];
  chronic?: { student: StudentRef; class_name: string | null; rate: number; absent: number; not_taken: number }[];
  threshold: number;
  /** Absent with the register status. */
  not_taken?: {
    date: string;
    class_id: number;
    class_name: string;
    level_name: string;
    class_teacher_name: string | null;
    branch: BranchRef | null;
  }[];
  branch_dimension: boolean;
  /** Present only where a class in scope marks lessons. */
  lessons_missed?: { subject: string; class_name: string; teacher_name: string | null; missed: number; students: string[] }[];
}

/** The three tables that download, and the three file types each comes in. */
export type ReportTable = "by_class" | "chronic" | "not_taken";
export type ReportFileType = "csv" | "xlsx" | "pdf";
