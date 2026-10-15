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

// ── Assessment setup (`structures/`, `scales/`, `remark-templates/`, `settings/`) ──

/** The server's verdict on a structure's total or a scale's bands. */
export interface SetupCheck {
  ok: boolean;
  message: string;
}

/** What a structure and a scale share: which programme and branch, and its life. */
interface SetupRecord {
  id: number;
  name: string;
  program: number;
  program_name: string;
  /** Null when it applies to every branch. */
  branch: number | null;
  scope_label: string;
  is_shared: boolean;
  status: SetupStatus;
  copied_from: number | null;
  /** A published result rests on it, so it can only be copied. */
  locked: boolean;
  lock_reason: string | null;
  created_at: string;
}

export interface StructureComponent {
  id: number;
  name: string;
  short_name: string;
  max_score: number;
  is_exam: boolean;
  order: number;
}

/** An assessment structure: the components a programme's marks are made of. */
export interface Structure extends SetupRecord {
  components?: StructureComponent[];
  total?: number;
  total_check?: SetupCheck;
}

export interface Band {
  id: number;
  min_score: number;
  grade: string;
  remark?: string;
  is_fail: boolean;
  order: number;
}

/** A grading scale: bands of percentage, each with its grade and remark. */
export interface Scale extends SetupRecord {
  bands?: Band[];
  check?: SetupCheck;
}

/** A component as a create or an edit sends it. An `id` keeps an existing one. */
export interface ComponentWrite {
  id?: number;
  name: string;
  short_name: string;
  max_score: number;
  is_exam: boolean;
}

export interface BandWrite {
  id?: number;
  min_score: number;
  grade: string;
  remark: string;
  is_fail: boolean;
}

/** A create names the programme; an edit cannot change it. */
export interface StructureWrite {
  name?: string;
  program?: number;
  branch?: number | null;
  components?: ComponentWrite[];
}

export interface ScaleWrite {
  name?: string;
  program?: number;
  branch?: number | null;
  bands?: BandWrite[];
}

/** One principal's remark template, for averages from `band_min` up to the next band. */
export interface RemarkTemplate {
  band_min: number;
  text: string;
}

/** The school's gradebook settings, with its programmes for the moderation switches. */
export interface GradebookSettings {
  show_class_stats: boolean;
  rank_in_class: boolean;
  conduct_ratings: boolean;
  rating_key: boolean;
  rating_traits: string[];
  /** Programme codes whose sheets go to a head of department first. */
  moderated_programs: string[];
  programs: { code: string; name: string; moderated: boolean }[];
}

export type GradebookSettingsWrite = Partial<Omit<GradebookSettings, "programs">>;

// ── The results hub (`hub/`) ────────────────────────────────────────────────

/** One class's place in the chain this term. */
export interface HubClass {
  id: number;
  name: string;
  branch: Ref | null;
  program: Ref;
  subjects_in: number;
  subjects_due: number;
  stage: ClassStage;
  /** The principal sent it back to its class teacher. */
  returned: boolean;
  class_teacher: Ref | null;
}

/** A sheet due this term that is not in, with the reason the platform knows. */
export interface LateSheet {
  class: Ref;
  subject: Ref;
  main_teacher: Ref | null;
  status: SheetStatus;
  reason_kind: LateReason;
  reason: string;
  entered: number;
  roll: number;
  reminded_today: boolean;
  /** The staff record to fix a locked account on; only for a reader who may. */
  staff_link: number | null;
}

/** The administrator's view of a term's results across their branches. */
export interface ResultsHub {
  /** The school has more than one branch, so branches are worth naming. */
  branch_dimension: boolean;
  term: TermRef;
  results_day: string | null;
  term_ends: string;
  kpis: {
    sheets_in: number;
    sheets_due: number;
    classes_compiled: number;
    awaiting_approval: number;
    published: number;
    held: number;
  };
  classes: HubClass[];
  late: LateSheet[];
  classes_without_branch: Ref[];
}

// ── Moderation (`moderation/`) ──────────────────────────────────────────────

/**
 * A sheet in a moderated programme, as the head of its department sees it.
 * The class figures follow the `class_stats` switch and are absent when closed.
 */
export interface ModerationRow {
  class: Ref;
  subject: Ref;
  branch: Ref | null;
  main_teacher: Ref | null;
  marked: number;
  roll: number;
  class_average?: string | null;
  highest?: number | null;
  lowest?: number | null;
  pass_rate?: number | null;
  status: SheetStatus;
  /** The other classes that offer the same subject this term, by name. */
  compare: string[];
  /** Submitted and waiting for this reader, who heads its department. */
  can_decide: boolean;
}

export interface ModerationQueue {
  branch_dimension: boolean;
  sheets: ModerationRow[];
}

// ── The broadsheet (`classes/<id>/broadsheet/`) and compiling ───────────────

/** Which class, for which term (the current one when omitted). */
export interface ClassKey {
  classId: number;
  term?: number;
}

/** A subject the class owes, and whether its sheet is in. */
export interface BroadsheetSubject {
  id: number;
  name: string;
  short: string;
  main_teacher: Ref | null;
  in: boolean;
}

/** One student's mark in one subject: a total, not taken, or not in yet. */
export interface BroadsheetCell {
  subject: number;
  state: "TOTAL" | "NOT_TAKEN" | "NOT_IN";
  total?: number | null;
}

/**
 * One student's line. `average` follows the overall-average switch, `position`
 * the position switch and is absent where the school does not rank, and
 * `comment_done` the class teacher's comment switch.
 */
export interface BroadsheetRow {
  student: StudentRef;
  cells: BroadsheetCell[];
  average?: string | null;
  position?: number | null;
  position_of?: number;
  comment_done?: boolean;
}

export interface Broadsheet {
  class: Ref;
  term: Ref;
  class_teacher: Ref | null;
  stage: ClassStage;
  /** The principal sent the class back to its class teacher, with a note. */
  returned: { by: string | null; at: string; note?: string } | null;
  subjects: BroadsheetSubject[];
  rows: BroadsheetRow[];
  gaps: { subject: Ref; main_teacher: Ref | null }[];
  /** School days in the term with no register taken; null once published. */
  attendance_warning?: { days_not_taken: number } | null;
  can_submit: boolean;
  submit_blockers: { subjects_missing: Ref[]; comments_missing: number };
  ranks: boolean;
}

/** One subject on a student's compile drawer. */
export interface CompileSubject {
  subject: Ref;
  total?: number | null;
  grade?: string | null;
  state: "TOTAL" | "NOT_TAKEN" | "NOT_IN";
}

/** A student's compile drawer: their term so far, and the class teacher's part. */
export interface Compile {
  student: StudentRef;
  /** Where the student sits on the roll, and their neighbours, by id. */
  index: number;
  of: number;
  previous: number | null;
  next: number | null;
  subjects: CompileSubject[];
  average?: string | null;
  /** Follows the register's counts switch; absent when closed. */
  attendance?: { opened: number; present: number; absent: number };
  /** Present only where the school rates conduct; absent with `traits` otherwise. */
  ratings?: Record<string, number>;
  traits?: string[];
  teacher_comment?: string;
  stage: ClassStage;
  /** The class teacher, on a class not yet with the principal. */
  can_edit: boolean;
}

export interface CompileWrite {
  teacher_comment: string;
  ratings?: Record<string, number>;
}
