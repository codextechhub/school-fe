/**
 * Shapes returned by /v1/academics/.
 *
 * Two rules from the backend's own serializers run through all of them, and the
 * types say so rather than leaving a reader to discover it:
 *
 *   1. The branch dimension RECEDES at a single-branch school. `branch`,
 *      `branch_name` and `scope_label` are dropped from the payload entirely -
 *      not nulled - so every one of them is optional here. A screen must treat
 *      "absent" as "this school has one branch", never as "no branch set".
 *
 *   2. A null `branch` on a row that HAS the field is a first-class value
 *      meaning school-wide. It is never "nobody filled this in".
 */

/** Present on every catalogue row at a multi-branch school; absent otherwise. */
export interface Scoped {
  /** Null means school-wide. Absent means the school has one branch. */
  branch?: number | null;
  branch_name?: string | null;
  /** "School-wide", or the branch's name. */
  scope_label?: string;
}

export type SessionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface Term {
  id: number;
  name: string;
  order_index: number;
  start_date: string;
  end_date: string;
  is_archived: boolean;
}

/** Derived from today's date by the server; never stored, so it cannot drift. */
export type TermState = "completed" | "ongoing" | "pending";

export interface AcademicSession {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: SessionStatus;
  activated_at: string | null;
  archived_at: string | null;
  /** Absent at a single-branch school. */
  is_school_wide?: boolean;
  terms: Term[];
  term_count: number;
  /** The branches this year runs at. Empty list means the whole school. */
  branches?: { id: number; name: string }[];
  /** "The whole school", or the named branches. */
  scope_label?: string;
}

export interface Department extends Scoped {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  /**
   * Programmes with a level in the year being read, and subjects in it.
   *
   * The year's, not all time: a department outlives the years it ran in, so
   * an all-time subject count added the same three subjects up once per year
   * the school had run. Zero here means "we ran nothing under this one that
   * year", which is how a school stops running something - not by deleting
   * it, which would take the year it DID run with it.
   */
  program_count: number;
  subject_count: number;
}

export interface Level extends Scoped {
  id: number;
  name: string;
  code: string;
  description: string;
  order_index: number;
  is_active: boolean;
  program: number;
  program_name: string;
  next_level: number | null;
  next_level_name: string | null;
  /** Pupils leave the school after this level. */
  is_terminal: boolean;
  /**
   * The three promotion states as one word, computed by the server.
   *
   * "unset" is the one that matters: a level with no target is either the end
   * of the school or a level nobody has wired, and reading the second as the
   * first is what graduates a year group by accident. Read this rather than
   * combining next_level and is_terminal here.
   */
  promotion: "promotes" | "terminal" | "unset";
  class_count: number;
  /**
   * Subjects offered at this level.
   *
   * Read by the delete confirmation: offerings CASCADE with the level, so a
   * screen that did not say how many would remove them unannounced.
   */
  subject_count: number;
}

export interface Program extends Scoped {
  id: number;
  name: string;
  code: string;
  description: string;
  order_index: number;
  is_active: boolean;
  department: number | null;
  department_name: string | null;
  levels: Level[];
  level_count: number;
}

export interface SchoolClass extends Scoped {
  id: number;
  name: string;
  code: string;
  description: string;
  arm: string;
  capacity: number | null;
  is_active: boolean;
  level: number;
  level_name: string;
  /** Subjects taught at this class's level - a real per-class figure. */
  subject_count: number;
  /**
   * The teacher responsible for this class, or null where nobody is.
   *
   * The designation is M12's and lives on the class because uniqueness is a
   * property of the class: one class has one class teacher. `staff_id` is the
   * STAFF record, not the account - a class teacher who has left stops being
   * one when their record says so, rather than when somebody remembers to
   * close a login.
   */
  class_teacher: { staff_id: number; name: string } | null;
}

export interface SubjectOffering {
  id: number;
  level: number;
  level_name: string;
  is_core: boolean | null;
}

export interface Subject extends Scoped {
  id: number;
  name: string;
  code: string;
  description: string;
  is_core: boolean;
  is_active: boolean;
  department: number | null;
  department_name: string | null;
  offerings: SubjectOffering[];
  level_count: number;
  /** A run of levels collapsed for a card: "JSS1-SSS3", or "Not set". */
  offered_label: string;
}

// ── Overview ────────────────────────────────────────────────────────────────

export interface OverviewSession {
  id: number;
  name: string;
  status: SessionStatus;
  start_date: string;
  end_date: string;
  percent_elapsed: number;
  current_term: string | null;
  next_term: string | null;
  terms: (Omit<Term, "is_archived"> & { state: TermState })[];
}

export interface AcademicOverview {
  /** Null when the school has no active year yet. */
  active_session: OverviewSession | null;
  /**
   * The year the reader is on, which is what every count below is about.
   *
   * The same block as `active_session` while the pill is on the live year.
   * They part company the moment somebody looks back at last year, and the
   * heading has to follow the counts rather than the school's current year.
   */
  viewed_session: OverviewSession | null;
  counts: {
    sessions: number;
    departments: number;
    programs: number;
    levels: number;
    classes: number;
    subjects: number;
  };
  /**
   * Branches in no live year at all. Only ever non-empty once a school has split
   * its calendar by branch - there is no correct year to guess for a branch
   * opened afterwards, so the server reports it rather than defaulting it.
   */
  branches_without_a_session: { id: number; name: string }[];
}

// ── Structure tree ──────────────────────────────────────────────────────────

export interface TreeRow {
  /** "session", "p:12", "l:44", "c:9", "c:9:s:3" - stable, so it keys expansion. */
  id: string;
  /** Note the server's spelling: "Programme", not "Program". */
  kind: "Session" | "Programme" | "Level" | "Class" | "Subject";
  label: string;
  /** 0 session, 1 programme, 2 level, 3 class, 4 subject. */
  depth: number;
  /** "3 levels", "No classes", "Core" - whatever this row contains. */
  contains: string;
  /** Level rows only. */
  class_count?: number;
  subject_count?: number;
  /** Both absent at a single-branch school, and on the session row. */
  scope_label?: string;
  /** True when the row belongs to the whole school rather than one branch. */
  is_shared?: boolean;
}

export interface StructureTree {
  /** Labels the tree; does NOT filter it - nothing here ties a class to a year. */
  session: { id: number; name: string } | null;
  depth: "full" | "levels";
  /**
   * A flat pre-order list, not a nested structure. A row has children when the
   * NEXT row's depth is greater than its own - the server sends no flag for it,
   * so `hasChildren` is derived (see academics-tree.ts).
   */
  rows: TreeRow[];
}

// ── Query arguments ─────────────────────────────────────────────────────────

/**
 * The branch lens, as every academics list receives it.
 *
 * "all" and undefined both mean "do not filter" and are dropped from the query
 * string. `"school"` asks for school-wide rows only - the backend's own spelling
 * for `branch__isnull=True`.
 */
export type BranchFilter = number | "all" | "school" | undefined;

export interface ListArgs {
  branch?: BranchFilter;
  /**
   * The academic year being looked at.
   *
   * Omitted means the school's live year, which is the server's own default -
   * so a screen that forgets shows the right rows rather than every year's at
   * once. Sent explicitly anyway, because the pill can point at a draft year
   * the school is planning or an archived one it is reading back.
   */
  session?: number;
  search?: string;
  /** Defaults to active-only on the server when omitted. "all" includes archived. */
  is_active?: "true" | "false" | "all";
  page?: number;
}

export interface ClassListArgs extends ListArgs {
  level?: number;
}

export interface SubjectWrite extends EntityWrite {
  is_core?: boolean;
  /**
   * The complete set of levels this subject is offered at.
   *
   * A replacement, not a diff - the server writes exactly this list - so the
   * drawer never has to work out what changed, and a level it forgot to mention
   * is a level the subject is no longer offered at. Sent inline with the rest,
   * so Save stays one call.
   */
  level_ids?: number[];
}

export interface ClassWrite extends EntityWrite {
  level?: number;
  arm?: string;
  /** Null is no limit, not a limit nobody has reached. M11 reads it that way. */
  capacity?: number | null;
}

export interface LevelWrite extends EntityWrite {
  /**
   * Send one or the other, never both: a level that promotes into JSS2 and
   * also ends the school is two answers to one question, and the server
   * refuses the pair.
   */
  next_level?: number | null;
  is_terminal?: boolean;
}

/**
 * Everything the shared entity drawer can send, for any of the five kinds.
 *
 * The union rather than five overloads: each write endpoint ignores the fields
 * that do not apply to it, so one body type keeps the drawer generic and stops
 * each screen widening it again.
 */
export type AnyEntityWrite = EntityWrite &
  Partial<ClassWrite> &
  Partial<SubjectWrite> &
  Partial<LevelWrite>;

export interface SubjectListArgs extends ListArgs {
  is_core?: "true" | "false";
}

export interface SessionListArgs {
  branch?: BranchFilter;
  search?: string;
  status?: SessionStatus | "all";
  page?: number;
}

// ── Write payloads ──────────────────────────────────────────────────────────

export interface TermWrite {
  id?: number;
  name: string;
  order_index: number;
  start_date: string;
  end_date: string;
}

/**
 * A session and everything about it, in one call.
 *
 * The drawer has one Save button, and the server takes it that way on purpose:
 * a session created by one request and its terms by three leaves a half-built
 * year on the school's screen the moment the second one fails.
 */
export interface SessionWrite {
  name: string;
  start_date: string;
  end_date: string;
  terms?: TermWrite[];
  /** Empty (or omitted) means the year the whole school runs. */
  branch_ids?: number[];
}

/** The refusal the drawer renders verbatim under the field that caused it. */
export interface DuplicateDetail {
  field: "name" | "code";
  /** The row that blocked this one. */
  conflict: string;
  /** Its branch name, or "School-wide". */
  scope_label: string;
}

/**
 * What the entity drawer writes.
 *
 * One shape for departments, programmes, levels, classes and subjects, because
 * the drawer is one form. Each write endpoint ignores the fields that do not
 * apply to it, so a caller never has to assemble a different body per kind.
 *
 * `branch: null` is school-wide and is sent EXPLICITLY. Omitting the key means
 * "leave it as it was" on a PATCH, which is a different answer - see the
 * backend's `UNSET` in services/scoping.py, which exists for exactly this.
 */
export interface EntityWrite {
  name?: string;
  code?: string;
  description?: string;
  branch?: number | null;
  is_active?: boolean;
  /** Programmes and subjects only. Null means "in no department". */
  department?: number | null;
}

/**
 * One class per arm, for a level.
 *
 * Idempotent on the server: an arm already present at that level and branch is
 * SKIPPED rather than refused, so a school adding a fourth arm types A, B, C, D
 * and gets one new class instead of an error about the three it already has.
 */
export interface GenerateArmsWrite {
  level: number;
  arms: string[];
  branch?: number | null;
}

/** One level name per line, as the bulk drawer sends them. */
export interface BulkLevelWrite {
  program: number;
  names: string[];
  branch?: number | null;
}
