/**
 * The gradebook's shared vocabulary, as `/v1/gradebook/` sends it.
 *
 * Each screen's own payload types sit beside its endpoints; this file holds
 * what several of them share: references, the term and branch a read is asked
 * for, and the states a sheet, a class and a result move through. The string
 * values are the backend's (`vs_gradebook.constants`), so a state the server
 * adds shows up here as a type error rather than as a blank chip.
 */

/** Any named row the server refers to: a class, subject, branch, teacher or term. */
export interface Ref {
  id: number;
  name: string;
}

/** A student as every gradebook row names them. */
export interface StudentRef extends Ref {
  admission_number: string;
}

/** The term a hub reads, with its session's name. */
export interface TermRef extends Ref {
  session: string;
}

/** A published examination paper for a sheet's subject. */
export interface ExamPaper {
  date: string;
  sitting: string;
  sitting_label: string;
}

/**
 * The term and branch a gradebook read is asked for.
 *
 * Both are optional. An omitted term is the school's current term by its own
 * clock, and an omitted branch is every branch the caller can see.
 */
export interface TermArgs {
  term?: number;
  branch?: number | "all";
}

/** Where one subject's sheet stands. APPROVED is moderated and in. */
export type SheetStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "RETURNED";

/** Where a class stands in the chain, as the hubs and approvals report it. */
export type ClassStage = "ENTERING" | "COMPILING" | "AWAITING" | "PUBLISHED";

/** A cell that holds no mark: absent (counts as zero) or excused (left out). */
export type Marker = "ABS" | "EXC";

/** What a family may see of one result. A held result is published but not released. */
export type ResultState = "NOT_PUBLISHED" | "HELD" | "RELEASED";

/** What happened to the guardian's "report card is ready" email. */
export type EmailState = "SENT" | "NO_EMAIL" | "HELD" | "NOT_SENT";

/** Why a sheet due this term is not in, on the hub's late list. */
export type LateReason =
  | "ENTERED"
  | "RETURNED"
  | "AWAITING_MODERATION"
  | "NO_MAIN_TEACHER"
  | "LAST_WORKING_DAY"
  | "CANNOT_SIGN_IN";

/** A structure or scale's life: drafted, in force, or replaced. */
export type SetupStatus = "DRAFT" | "IN_USE" | "RETIRED";

/** Where a correction to a published result stands. */
export type AmendmentStatus = "PENDING" | "APPROVED" | "REJECTED";

// ── The teacher's hub (`hub/mine/`) ─────────────────────────────────────────

/** What the card for one of the teacher's own sheets offers to do. */
export type SheetCta = "ENTER" | "CONTINUE" | "REVISE" | "VIEW";

/** A sheet the reader is main teacher of. */
export interface MySheet {
  class: Ref;
  subject: Ref;
  /** Students with every component entered, of `roll`. */
  entered: number;
  roll: number;
  exam_paper: ExamPaper | null;
  status: SheetStatus;
  cta: SheetCta;
}

/** Work the reader's other hats carry: a class they lead, a department they head. */
export interface Duty {
  kind: "CLASS_TEACHER" | "HEAD_OF_DEPARTMENT";
  class: Ref | null;
  department: Ref | null;
  /** Sheets waiting for the head to moderate. */
  waiting: number | null;
  subjects_in: number | null;
  subjects_due: number | null;
  stage: ClassStage | null;
}

export interface TeacherHub {
  term: TermRef;
  sheets: MySheet[];
  duties: Duty[];
}

// ── The score sheet (`sheets/<class>/<subject>/`) ───────────────────────────

/** Which sheet, for which term (the current one when omitted). */
export interface SheetKey {
  classId: number;
  subjectId: number;
  term?: number;
}

/** One column of the sheet. */
export interface SheetComponent {
  id: number;
  name: string;
  short_name: string;
  max_score: number;
  is_exam: boolean;
}

/** One cell: a whole mark, a marker, or neither (blank). */
export interface SheetCell {
  component: number;
  mark: number | null;
  marker: Marker | null;
}

/**
 * One student's line. The worked-out figures follow the `row_result` switch
 * and are absent when it is closed; `cells` follows the `mark` switch.
 */
export interface SheetRow {
  student: StudentRef;
  cells?: SheetCell[];
  total?: number | null;
  obtainable?: number | null;
  percentage?: string | null;
  grade?: string | null;
  remark?: string | null;
  is_fail?: boolean | null;
  complete?: boolean;
  excused_note?: string | null;
}

export interface Sheet {
  class: Ref;
  subject: Ref;
  term: Ref;
  main_teacher: Ref | null;
  assistants: string[];
  exam_paper: ExamPaper | null;
  status: SheetStatus;
  needs_moderation: boolean;
  is_elective: boolean;
  /** Elective only: students taking it, of `roll` on the class. */
  takers: number | null;
  roll: number | null;
  returned: { by: string | null; at: string; note?: string } | null;
  saved_at: string | null;
  progress?: { complete: number; total: number };
  /** The reader may save marks now: main teacher (or `enter_any`), and not locked. */
  can_enter: boolean;
  can_submit: boolean;
  /** Blank cells across the sheet. */
  blank_count: number;
  components: SheetComponent[];
  rows: SheetRow[];
}

/** One cell to save. A mark and a marker are exclusive; both null blanks it. */
export interface CellWrite {
  student: number;
  component: number;
  mark: number | null;
  marker: Marker | null;
}

/** A cell the server refused, in a 422 `CELLS_REFUSED`. */
export interface RefusedCell {
  student: number;
  component: number;
  code: string;
  message: string;
}

/** Where a submitted sheet goes next. */
export interface SubmitResult {
  next: "MODERATION" | "CLASS_TEACHER";
  sheet: Sheet;
}
