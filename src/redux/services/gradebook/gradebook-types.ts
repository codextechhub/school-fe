/**
 * The gradebook's shared vocabulary, as `/v1/gradebook/` sends it.
 *
 * Each screen's own payload types sit beside its endpoints; this file holds
 * what several of them share: references, the term and branch a read is asked
 * for, and the states a sheet, a class and a result move through. The string
 * values are the backend's (`vs_gradebook.constants`), so a state the server
 * adds shows up here as a type error rather than as a blank chip.
 */
import type { PaginatedEnvelope } from "../onboarding/onboarding-types";

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

/**
 * What happened to the guardian's "report card is ready" email. NOT_SENT is a
 * released result whose email has no recorded outcome, never to be read as sent.
 */
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
  /**
   * Whether every parent with a parent app account hears of a child's released
   * result, not only the primary guardian. Absent when the reader's role may
   * not read it (Field Access `gradebook.setup.tell_every_parent`).
   */
  tell_every_parent?: boolean;
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

// ── Approvals and publishing (`approvals/`, `classes/<id>/…`) ──────────────

/** A student whose result is held, and who held it. The reason stays on the holds screen. */
export interface HeldStudent {
  student: Ref;
  held_by: string | null;
  placed_at: string;
}

/** A class with the principal or published, as the approvals queue lists it. */
export interface ApprovalRow {
  class: Ref;
  /** Null at a school with one branch. */
  branch: Ref | null;
  class_teacher: Ref | null;
  subjects_in: number;
  subjects_due: number;
  stage: ClassStage;
  submitted_at: string | null;
  published_at: string | null;
  held: HeldStudent[];
  /** The reader may return, comment on and publish it now: it is awaiting approval. */
  can_decide: boolean;
}

export interface Approvals {
  branch_dimension: boolean;
  classes: ApprovalRow[];
}

/** Who a class return sends back to: the class teacher, or one subject's sheet. */
export interface ClassReturnBody {
  note: string;
  subject?: number;
}

/**
 * One band of the school's remark templates for a class. `template` is the
 * school's sentence and is absent where the reader may not read templates;
 * `override` is the class's own comment, null until one is written.
 */
export interface PrincipalBand {
  band_min: number;
  template?: string;
  override?: { text: string; written_by: string | null; written_at: string } | null;
}

export interface PrincipalComments {
  class: Ref;
  term: Ref;
  /** The class is published, so its comments no longer change. */
  locked: boolean;
  bands: PrincipalBand[];
}

export interface PrincipalCommentsWrite {
  comments: { band_min: number; text: string }[];
}

/** What publishing the class now would do. */
export interface PublishPreview {
  class: Ref;
  released: number;
  emailed: number;
  no_email: number;
  held: HeldStudent[];
}

/** One class's answer to a publish: published, or why not (`code`, `message`). */
export interface PublishResult {
  class: Ref;
  published: boolean;
  code?: string;
  message?: string;
  released: number;
  emailed: number;
  no_email: number;
  held: number;
}

// ── Fee holds (`holds/`) ───────────────────────────────────────────────────

/** A hold on a student's result. `reason` follows the hold-reason switch. */
export interface HoldRecord {
  id: number;
  reason?: string;
  placed_by: string | null;
  placed_at: string;
}

/**
 * One student on the holds list. It never carries a mark. The balance (kobo),
 * oldest unpaid day and days owed follow the balance switch, and are null when
 * Finance could not answer, never zero.
 */
export interface HoldRow {
  student: StudentRef;
  class: Ref;
  branch: Ref | null;
  balance?: number | null;
  oldest_unpaid_on?: string | null;
  days_owed?: number | null;
  hold: HoldRecord | null;
  /** Released results cannot be held. */
  released: boolean;
  released_on: string | null;
}

export interface HoldsArgs extends TermArgs {
  classId?: number;
  search?: string;
  owes?: boolean;
  page?: number;
}

/** The holds page, with when Finance was read and whether it answered. */
export interface HoldsPage extends PaginatedEnvelope<HoldRow> {
  /** The term listed, which a hold is placed for. */
  term: Ref;
  /** Every class the list can be narrowed to, whatever the filters. */
  classes: Ref[];
  /** Present for a reader of balances. */
  as_of?: string;
  finance_available?: boolean;
  /** Present when `owes` was asked for: whether the list was narrowed to it. */
  owes_applied?: boolean;
}

export interface HoldLiftResult {
  hold: HoldRecord & { lifted_by: string | null; lifted_at: string | null; lift_note?: string };
  /** The class was already published, so lifting released the result. */
  released: boolean;
  row: HoldRow;
}

// ── Release, report cards and a student's results ──────────────────────────

/** A class a release reader may open, with where it stands in the chain. */
export interface ReleaseClass {
  class: Ref;
  /** Null at a school with one branch. */
  branch: Ref | null;
  stage: ClassStage;
  published_at: string | null;
}

export interface ReleaseClasses {
  term: Ref;
  branch_dimension: boolean;
  classes: ReleaseClass[];
}

/**
 * One student on a release list. `guardian` is the primary guardian, null
 * when there is none, absent or cut down where Field Access hides it.
 * `email_state` and `emailed_at` follow the email-state switch.
 */
export interface ReleaseRow {
  student: StudentRef;
  guardian?: { name?: string; email?: string | null } | null;
  result_state: ResultState;
  email_state?: EmailState | null;
  emailed_at?: string | null;
  released_at: string | null;
}

export interface Release {
  class: Ref;
  term: Ref;
  stage: ClassStage;
  published_at: string | null;
  class_size: number;
  held_count: number;
  rows: ReleaseRow[];
}

/** A printed line: a label and its value worded for print. */
export interface CardLine {
  label: string;
  value: string;
}

export interface CardSubject {
  name: string;
  /** Component scores as printed ("18", "ABS", "Exc"). */
  cells?: string[];
  total?: number | null;
  grade?: string | null;
  remark?: string | null;
  /** Present only where the school printed class figures and the reader may read them. */
  class_average?: string | null;
  highest?: number | null;
  lowest?: number | null;
}

/** The school year on the last term's card: each subject's total per term and the annual figures. */
export interface Cumulative {
  terms: string[];
  subjects: { name: string; totals?: string[]; annual_average?: string | null }[];
  annual_average?: string | null;
  annual_position?: string;
  promotion_line?: string;
}

/**
 * A report card, every figure from the snapshot published with the class.
 * A line or block the reader may not read is absent rather than blank.
 */
export interface ReportCard {
  letterhead: {
    school_name: string;
    logo_url: string | null;
    branch_name: string | null;
    branch_address: string | null;
    phone: string | null;
  };
  term_line: string;
  facts: CardLine[];
  components: { short_name: string; max_score: number }[];
  subjects: CardSubject[];
  totals: CardLine[];
  attendance?: CardLine[];
  ratings?: { trait: string; value: number }[];
  rating_key?: string;
  teacher_comment?: string;
  teacher_name?: string | null;
  principal_comment?: string | null;
  principal_name?: string | null;
  grading_key: string;
  cumulative?: Cumulative;
  next_term_line?: string;
  version: number;
  /** The result is withheld from the family; staff still read the card. */
  held: boolean;
}

export interface ClassCards {
  class: Ref;
  term: Ref;
  cards: ReportCard[];
  /** Students without a card in the print, and why. */
  left_out: { student: StudentRef; reason: "HELD" | "NOT_RELEASED" }[];
  left_out_count: number;
}

/** One term on a student's Results tab: published with its figures, or one calm sentence. */
export interface ResultTerm {
  term: Ref;
  session: Ref;
  published: boolean;
  message?: string;
  overall_average?: string | null;
  /** "3rd of 24", only where that term ranked. */
  position?: string;
  released_at?: string | null;
  release_label?: string;
  version?: number;
  subjects?: { id: number; name: string; total?: number | null; grade?: string | null; remark?: string | null }[];
  cumulative?: Cumulative;
  class_id?: number;
}

/** A hold placed or lifted, or an amendment, on a student's results. */
export interface ResultHistoryEntry {
  kind: string;
  text: string;
  reason?: string;
  lift_note?: string;
  amendment?: {
    id: number;
    status: string;
    subject: Ref;
    term: Ref;
    amendment_reason?: string;
    raised_by: string | null;
    raised_at: string;
    decided_by: string | null;
    decided_at: string | null;
    decision_note?: string;
    version: number | null;
  };
  by: string | null;
  at: string;
}

export interface StudentResults {
  student: StudentRef & { class: Ref | null; branch: Ref | null };
  guardian?: { name?: string; email?: string | null } | null;
  terms: ResultTerm[];
  history: ResultHistoryEntry[];
}

// ── Corrections to published results (`amendments/`) ───────────────────────

/**
 * A subject's cells with what is worked out from them. `cells` follows the
 * mark switch and the figures the row-result switch, as on the sheet.
 */
export interface AmendmentLine {
  cells?: SheetCell[];
  total?: number | null;
  obtainable?: number | null;
  percentage?: string | null;
  grade?: string | null;
  remark?: string | null;
  is_fail?: boolean | null;
}

/** What the correction drawer shows before one is asked for: the subject as published. */
export interface AmendmentForm extends AmendmentLine {
  class: Ref;
  student: StudentRef;
  subject: Ref;
  term: Ref;
  /** The report card version a correction would replace. */
  version: number;
  components: SheetComponent[];
  /** The correction already waiting for this subject; another cannot be raised meanwhile. */
  pending: { id: number; raised_at: string } | null;
}

export interface AmendmentTarget {
  term?: number;
  classId: number;
  studentId: number;
  subjectId: number;
}

export interface AmendmentRaise {
  term: number;
  class: number;
  student: number;
  subject: number;
  reason: string;
  /** Only the columns being changed. */
  cells: { component: number; mark: number | null; marker: Marker | null }[];
}

/**
 * A correction. The reason and the decision note follow the amendment
 * switches; `before` and `after` the sheet's. `can_decide` is true while it
 * waits and the reader did not raise it; deciding also needs the decide key.
 */
export interface AmendmentRow {
  id: number;
  status: AmendmentStatus;
  student: StudentRef;
  class: Ref;
  term: Ref;
  subject: Ref;
  branch: Ref | null;
  amendment_reason?: string;
  raised_by: string | null;
  raised_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note?: string;
  /** The report card version an approval produced. */
  version: number | null;
  before?: AmendmentLine;
  after?: AmendmentLine;
  can_decide: boolean;
}

export interface AmendmentsArgs extends TermArgs {
  status?: AmendmentStatus;
  page?: number;
}

export interface AmendmentsPage extends PaginatedEnvelope<AmendmentRow> {
  branch_dimension: boolean;
}

// ── Performance analytics (`analytics/`) ───────────────────────────────────

/**
 * One subject in one published class. `average`, `spread` and `pass_rate`
 * are class figures and follow the class-figures switch; `marked` counts
 * students and has none.
 */
export interface AnalyticsSubject {
  subject: Ref;
  class: Ref;
  average?: string | null;
  spread?: { grade: string; count: number }[];
  pass_rate?: number | null;
  marked: number;
}

/** A subject offered by two or more published classes, and the gap between highest and lowest average. */
export interface AnalyticsCompare {
  subject: Ref;
  arms: { class: Ref; average?: string }[];
  gap?: string;
}

/**
 * A student's overall average this term against their most recent earlier
 * published term. `from`, `to` and `change` follow the overall-average switch.
 */
export interface AnalyticsMover {
  student: StudentRef;
  class: Ref;
  from_term: Ref;
  from?: string;
  to?: string;
  change?: string;
}

/** The highest overall average of a class and every student on it. */
export interface AnalyticsTop {
  class: Ref;
  students: Ref[];
  average: string;
}

export interface Analytics {
  term: TermRef;
  scope: {
    branch_dimension: boolean;
    classes: { id: number; name: string; branch: Ref | null }[];
    published_count: number;
  };
  ranks: boolean;
  subjects: AnalyticsSubject[];
  compare: AnalyticsCompare[];
  movers: AnalyticsMover[];
  /** Absent for a reader who may not read both positions and overall averages. */
  tops?: AnalyticsTop[];
}

export type AnalyticsTable = "subjects" | "movers";

/** A downloaded table: an object URL the caller revokes, and the server's file name. */
export interface DownloadedFile {
  url: string;
  filename: string;
}

// ── Uploading a score sheet (`sheets/<c>/<s>/import/`) ─────────────────────

/** A problem in an uploaded file or one of its rows; `component` names the column. */
export interface ImportIssue {
  code: string;
  message: string;
  component?: number;
}

/**
 * What one uploaded cell would do. `value` and `existing` are a whole mark,
 * ABS or EXC, or null; `outcome` is null where the cell has an issue. All
 * three state a mark, so they follow the mark switch.
 */
export interface ImportCell {
  component: number;
  value?: number | string | null;
  outcome?: "NEW" | "SAME" | "REPLACES" | "BLANK" | null;
  existing?: number | string | null;
}

export interface ImportRow {
  /** The row in the spreadsheet. */
  row_number: number;
  admission_number: string;
  /** Null when the admission number names nobody the reader can see. */
  student: Ref | null;
  cells: ImportCell[];
  issues: ImportIssue[];
}

/** A checked upload. A file whose headings do not fit has `file_issues`, no token and no rows. */
export interface ImportPreview {
  token: string | null;
  expires_at: string | null;
  summary: { rows: number; ready: number; with_issues: number; replaces: number };
  file_issues: ImportIssue[];
  rows: ImportRow[];
}
