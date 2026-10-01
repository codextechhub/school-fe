import type { AsAtMeta } from "@/lib/as-at";
import type { AdmissionPolicy } from "../students/students-types";
import type { Envelope, Pagination } from "../onboarding/onboarding-types";

/**
 * The shapes `/v1/i/me/staff/` speaks, mirrored from `vs_staff/serializers.py`.
 *
 * **Two statuses, never one.** `employment_status` answers whether somebody
 * still works here; `account_status` answers whether their login may be used.
 * They are separate columns enforced by separate rules, and a screen that
 * merged them would tell a school its locked-out teacher had been suspended.
 * `account_flag` is the server's own answer to "do these two disagree", and it
 * is null in the ordinary case so the one row worth reading stands out.
 *
 * **A file is a media path, never a direct link.** `photo_url` and a document's
 * `file_url` point at the authenticated media view, which applies this module's
 * own read policy per file.
 */

import type { StaffOrganogramPlacement } from "./organogram-types";

// ── Vocabularies ───────────────────────────────────────────────────────────

/**
 * Does this person still work here. Set only by a logged transition.
 *
 * Two statuses can come before `INVITED`, and in both the record and the
 * account exist and nothing has been sent. `PENDING_APPROVAL` is a hire at a
 * school that approves each one (Settings, Staff), moved on only by that
 * approval. `AWAITING_GO_LIVE` is somebody imported while the school was
 * being set up, whose invitation goes out with everybody else's when the
 * school goes live.
 */
export type EmploymentStatus =
  | "PENDING_APPROVAL"
  | "AWAITING_GO_LIVE"
  | "INVITED"
  | "ACTIVE"
  | "ON_LEAVE"
  | "SUSPENDED"
  | "RESIGNED"
  | "TERMINATED";

/**
 * May this login be used. The identity layer's, not this module's.
 *
 * `LOCKED` is absent from `EmploymentStatus` on purpose and present here: it is
 * a security lockout cleared by a password reset, and a teacher who mistyped
 * her password three times is employed, at work, and in front of her class.
 */
export type AccountStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "LOCKED"
  | "DEACTIVATED"
  | "REJECTED";

/** What kind of contract, and nothing about its terms. */
export type EmploymentType =
  "FULL_TIME" | "PART_TIME" | "CONTRACT" | "VOLUNTEER";

export type DocumentType =
  | "CV"
  | "DEGREE_CERTIFICATE"
  | "PROFESSIONAL_CERTIFICATE"
  | "IDENTIFICATION"
  | "OTHER";

export type LeaveType =
  | "ANNUAL"
  | "SICK"
  | "MATERNITY"
  | "PATERNITY"
  | "STUDY"
  | "COMPASSIONATE"
  | "OTHER";

/** Four stored values. `Completed` is derived at read time into `display_status`. */
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/** Whether this person owns the subject in this class, or helps with it. */
export type TeachingPart = "LEAD" | "ASSISTANT";

// ── People ─────────────────────────────────────────────────────────────────

/** An id and a display name, and never an email address. */
export interface StaffActor {
  id: number;
  name: string;
}

/**
 * A chip shown only where the account disagrees with the employment record.
 *
 * Null in the ordinary case. `note` is the server's own sentence and is worth
 * rendering verbatim: it is what stops a reader taking a lockout for discipline.
 */
export interface StaffAccountFlag {
  code: "LOCKED" | "ACCOUNT_SUSPENDED" | "NOT_ACTIVATED";
  label: string;
  note: string;
}

/** One row of the directory. */
export interface StaffListRow {
  id: number;
  /** The account, not the staff record. Payroll rows point at this. */
  user_id: number;
  full_name: string;
  // Field Access fields (`school.teachers`): absent when the viewer may not
  // read them. `full_name` is rebuilt from the name parts the viewer may read.
  email?: string;
  staff_number?: string;
  job_title?: string;
  /**
   * Still employed. False once somebody has resigned or been terminated.
   *
   * The server's own answer rather than a status comparison made here, so the
   * two codes that mean "has left" are decided in one place. A screen drawing
   * a finished row differently reads this rather than re-deriving the rule and
   * getting it half right.
   */
  on_roll: boolean;
  /**
   * What was DECIDED about their employment. Never `ON_LEAVE`.
   *
   * Five values a person sets through a logged transition. Use it for history,
   * for the lifecycle strip, and anywhere the question is what somebody did.
   */
  employment_status: EmploymentStatus;
  employment_status_label: string;
  /**
   * What the row READS as, which is what a screen shows.
   *
   * The same value, except that an ACTIVE person whose approved leave covers
   * today reads `ON_LEAVE`. Nobody sets that: a stored On Leave has no way
   * back, because approval is an event and a leave ENDING is not one, and
   * nothing here runs on a schedule to notice. Derived on every read instead,
   * so it is right on the way in and on the way out.
   */
  display_employment_status: EmploymentStatus;
  display_employment_status_label: string;
  employment_type?: EmploymentType | "";
  account_status: AccountStatus;
  account_flag: StaffAccountFlag | null;
  /** Every distinct role name they hold, de-duplicated and sorted. */
  roles: string[];
  branch_id: number | null;
  /** Every equal branch posting, empty for school-wide. */
  posting_branch_ids: number[];
  /**
   * `null` where the viewer works in one branch, including everybody at a
   * one-branch school: the dimension recedes entirely rather than repeating one
   * value on every row. `"School-wide"` for somebody with no single base.
   */
  branch_name: string | null;
  /** `null` where the viewer works in one branch, for the same reason. */
  posted_school_wide: boolean | null;
  /**
   * False when the viewer may read this person but not change them: a branch
   * administrator looking at somebody school-wide or also posted to a branch
   * they do not cover. Absent reads as changeable.
   */
  can_manage?: boolean;
  /** A count of assignments. There is no target to compare it against. */
  teaching_load: number;
  /**
   * Approved leave covering today. The reason `display_employment_status` and
   * `employment_status` differ, and the only reason they can.
   */
  on_leave_today: boolean;
  /**
   * The last day of the leave that is running, or null when none is.
   *
   * The latest end date where two approved absences overlap today, because that
   * is the day they actually return. Always null unless `on_leave_today` is
   * true, so a screen cannot say somebody is away until a date that has passed.
   */
  on_leave_until: string | null;
  hire_date: string | null;
  /** The server's own answer, so a row's button never contradicts the API. */
  can_resend: boolean;
  invited_at: string | null;
}

/** The account half, kept as its own object rather than merged into the record. */
export interface StaffAccountState {
  status: AccountStatus;
  label: string;
  can_sign_in: boolean;
  can_hold_password: boolean;
  email: string;
}

/**
 * Where somebody sits on the ordinary path, or that they are off it.
 *
 * Invited then Active is the whole of the ordinary path. The other four
 * statuses are not later stages of it and must not be drawn as though they
 * were: a strip showing Terminated as step three would say a school expects
 * everybody to get there.
 */
export interface StaffLifecycle {
  on_path: boolean;
  steps: { value: EmploymentStatus; label: string }[];
  current: EmploymentStatus;
  note?: string;
}

/** Derived from the hire date, and absent where there is none. */
export interface StaffTenure {
  years: number;
  months: number;
}

/** One person's record. */
/**
 * One person's record.
 *
 * Every optional personal and employment field is a Field Access field of
 * `school.teachers`, absent when the viewer may not read it. Read as at an
 * earlier day, the record carries `as_at`.
 */
/**
 * The directory-row fields a staff record may leave out.
 *
 * A record carries only the sections its reader may see (the school's
 * staff-profile setting, and the reader's keys), so even a full record can
 * lack the employment block or the roles: a teacher reading their own record
 * sees no roles unless the school shows people their own. List rows are never
 * trimmed and keep these required.
 */
type SectionedRowFields =
  | "on_roll" | "employment_status" | "employment_status_label"
  | "display_employment_status" | "display_employment_status_label"
  | "roles" | "teaching_load" | "on_leave_today" | "on_leave_until" | "hire_date";

export interface StaffDetail
  extends Omit<StaffListRow, SectionedRowFields>,
    Partial<Pick<StaffListRow, SectionedRowFields>> {
  account: StaffAccountState;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth?: string | null;
  phone?: string;
  gender?: string;
  /** Fields present in this record that the viewer may not change. */
  _read_only_fields?: string[];
  photo_url?: string | null;
  exit_date?: string | null;
  tenure?: StaffTenure | null;
  lifecycle?: StaffLifecycle;
  counts?: {
    qualifications: number;
    documents: number;
    teaching_assignments: number;
    leave_requests: number;
  };
  created_by: StaffActor | null;
  /**
   * Their place on the organogram, from their current primary appointment:
   * the post, its unit and the person holding the post above. Null when they
   * hold no post, and absent on a record read as at an earlier day.
   */
  organogram?: StaffOrganogramPlacement | null;
  /**
   * How much of this record the reader was given. `full` for the person
   * themselves and for a reader whose keys reach them; `restricted` for a line
   * manager or a colleague, who gets only what the school's staff-profile
   * setting shows their relationship. A restricted record lacks every field
   * outside `visible_sections`, and several a full one always carries.
   */
  profile_view?: StaffProfileView;
  /** The parts of the profile this reader may open, in the setting's order. */
  visible_sections?: StaffProfileSection[];
  /** The first day this record can be read as at; null before it is first recorded. */
  history_starts: string | null;
  /** Present only on a record read as at an earlier day. */
  as_at?: AsAtMeta;
  /**
   * The document types the school expects (Settings, Staff) that this record
   * holds none of. A flag, never a gate. Empty when nothing is missing or the
   * school expects nothing, null on a record read as at an earlier day, and
   * absent for a reader without the records group.
   */
  missing_documents?: StaffMissingDocument[] | null;
  /**
   * What the person may change about themselves, as field names (`phone`,
   * `photo`, `first_name`...). Only on the signed-in person's own record.
   */
  self_editable_fields?: string[];
}

/** An expected document type with nothing of that type on the record. */
export interface StaffMissingDocument {
  type: DocumentType;
  label: string;
}

/**
 * The create's answer: the new record, and whether it waits for approval.
 *
 * `awaiting_approval` is true where the school approves each hire. The record
 * then reads `PENDING_APPROVAL` and no invitation has been sent; the approval
 * sends it.
 */
export type StaffCreated = StaffDetail & { awaiting_approval?: boolean };

// ── Profile visibility ─────────────────────────────────────────────────────

export type StaffProfileView = "full" | "restricted";

/** A part of a staff profile the school's visibility setting switches. */
export type StaffProfileSection =
  | "contact" | "employment" | "personal" | "records" | "leave"
  | "teaching" | "history" | "roles";

/**
 * A colleague's profile as a line manager or another colleague reads it.
 *
 * The contact card is always there; everything else arrives only when its
 * section is in `visible_sections`.
 */
export interface StaffRestrictedDetail {
  id: number;
  user_id: number;
  profile_view: "restricted";
  visible_sections: StaffProfileSection[];
  full_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  photo_url?: string | null;
  branch_name?: string | null;
  posted_school_wide?: boolean | null;
  organogram?: StaffOrganogramPlacement | null;
  staff_number?: string;
  job_title?: string;
  employment_type?: EmploymentType | "";
  hire_date?: string | null;
  exit_date?: string | null;
  display_employment_status?: EmploymentStatus;
  display_employment_status_label?: string;
  on_leave_today?: boolean;
  on_leave_until?: string | null;
  middle_name?: string;
  date_of_birth?: string | null;
  gender?: string;
  roles?: string[];
  counts?: Partial<StaffDetail["counts"]>;
}

// ── The directory page ─────────────────────────────────────────────────────

/**
 * The header's six figures.
 *
 * They are not all the same kind of thing, which is why each is labelled rather
 * than pooled. `locked_accounts` is an ACCOUNT count sitting beside employment
 * ones and must be labelled as such, or a school reads a security lockout as a
 * suspension.
 */
export interface StaffCounts {
  total: number;
  currently_employed: number;
  by_employment_status: {
    value: EmploymentStatus;
    label: string;
    count: number;
  }[];
  with_teaching_duties: number;
  locked_accounts: number;
  /**
   * People lacking a document type the school expects. Null for a reader
   * without the records key, and where the school expects no document.
   */
  missing_documents?: number | null;
  /**
   * By branch where a school has several, by role where it has one.
   *
   * The dimension recedes rather than repeating one value on every row, so
   * `breakdown_by` is what the panel's heading reads and the rows are the same
   * shape either way. A branch `value` is an id and null means school-wide; a
   * role `value` is the role's name and null means no role.
   */
  breakdown_by: "branch" | "role";
  breakdown: {
    value: number | string | null;
    label: string;
    count: number;
  }[];
}

/** A role this school may hand out right now. */
export interface StaffRoleOption {
  value: string;
  label: string;
  branch_ids: number[];
}

/**
 * The list response.
 *
 * The counts, the role options and `multi_branch` ride along with the page
 * rather than coming from three more calls: a directory that needs four calls
 * to draw its header draws it late. The role options matter for a second
 * reason - a form that hard-codes role keys drifts the moment a school adds
 * one, and the school's own roles endpoint is a surface it may not hold.
 */
export interface StaffListResponse {
  success: boolean;
  message: string;
  pagination: Pagination;
  data: StaffListRow[];
  counts: StaffCounts;
  role_options: StaffRoleOption[];
  /**
   * The role a new member of staff is given without anybody choosing it, or
   * `null` while the school is onboarding, where the Add form asks for one of
   * the two administrator roles instead. The server grants it itself and
   * refuses any other role on the create.
   */
  starting_role: { value: string; label: string } | null;
  /** False at a one-branch school, where every branch control disappears. */
  multi_branch: boolean;
}

/** What the directory can be narrowed by. Every filter is the server's. */
export interface StaffListQuery {
  page?: number;
  search?: string;
  employment_status?: EmploymentStatus;
  /** Separate from `employment_status`, never merged. They answer differently. */
  account_status?: AccountStatus;
  /** A role KEY, not its display name. */
  role?: string;
  /** A branch id, or the literal `"school"` for people with no single base. */
  branch?: string;
  teaching?: "true" | "false";
  /** People lacking a document the school expects. Needs the records key. */
  missing_documents?: "true";
}

// ── Writes on the record ───────────────────────────────────────────────────

/** A qualification, as typed rows. Nothing verifies one, so nothing claims to. */
export interface StaffQualification {
  id: number;
  qualification: string;
  institution: string;
  year_obtained: number | null;
  note: string;
  created_at: string;
}

export type StaffQualificationWrite = Omit<
  StaffQualification,
  "id" | "created_at"
>;

/** A file against a person, served through the authenticated media view. */
export interface StaffDocument {
  id: number;
  document_type: DocumentType;
  document_type_label: string;
  title: string;
  file_url: string | null;
  /** Held on the day a past view reads, and replaced or removed since. */
  file_retired?: boolean;
  uploaded_by: StaffActor | null;
  created_at: string;
}

/**
 * The Add screen, in one payload.
 *
 * Carries qualifications, subjects and classes; **documents are not here**.
 * They are uploaded against the id this call returns, because a file is
 * multipart and a create is one transaction.
 */
export interface StaffCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  gender?: string;
  /**
   * Onboarding only: a role KEY from `role_options`. A live school sends none
   * and the server grants `starting_role`, refusing any other.
   */
  role?: string;
  /**
   * Onboarding only: a branch id for a branch-pinned grant, `null` for
   * school-wide, omitted to follow the posting. A live school sends none.
   */
  role_branch?: string | null;
  staff_number?: string;
  job_title?: string;
  employment_type?: EmploymentType | "";
  hire_date?: string | null;
  /** Where they are based. Omitted means across the whole school. */
  branch?: string | null;
  middle_name?: string;
  date_of_birth?: string | null;
  qualifications?: StaffQualificationWrite[];
  subjects?: number[];
  classes?: number[];
}

/**
 * What an administrator may change on a record.
 *
 * No `employment_status`: it moves only through the lifecycle endpoint, which
 * is the only place that also does the right thing to the account. No `email`
 * either - changing an account's address is a different key on a different
 * endpoint.
 */
export interface StaffUpdate {
  staff_number?: string;
  job_title?: string;
  employment_type?: EmploymentType;
  hire_date?: string | null;
  middle_name?: string;
  date_of_birth?: string | null;
  branch?: string | null;
  phone?: string;
  gender?: string;
  first_name?: string;
  last_name?: string;
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

/** One move the drawer may offer, and what it would do to the account. */
export interface StaffStatusOption {
  value: EmploymentStatus;
  label: string;
  /** The plain sentence shown before anything is confirmed. */
  account_effect: string;
  reason_required: boolean;
  last_working_day_required: boolean;
}

/**
 * What this person can be moved to.
 *
 * The drawer reads this rather than hard-coding a transition table, so a rule
 * changed on the server reaches the screen without a release. `INVITED` returns
 * no options at all: it is left by the invited person using their own link.
 */
export interface StaffStatusOptions {
  employment_status: EmploymentStatus;
  account_status: AccountStatus;
  options: StaffStatusOption[];
  /**
   * Why there is nothing to choose from, where the reason is not the record.
   *
   * Null in the ordinary case. An empty list otherwise reads as a record that
   * has been closed, which is the wrong thing to tell an administrator looking
   * at her own.
   */
  note: string | null;
  /** Named, never counted. A count sends a head teacher hunting. */
  assignments_needing_cover: string[];
}

export interface StaffStatusChange {
  to_status: EmploymentStatus;
  effective_date?: string;
  reason?: string;
  last_working_day?: string;
  note?: string;
}

export interface StaffEmploymentEvent {
  id: number;
  from_status: EmploymentStatus | null;
  from_status_label: string | null;
  to_status: EmploymentStatus;
  to_status_label: string;
  reason: string;
  effective_date: string | null;
  last_working_day: string | null;
  note: string;
  changed_by: StaffActor | null;
  created_at: string;
}

export interface StaffStatusResult {
  staff: StaffDetail;
  event: StaffEmploymentEvent;
  assignments_needing_cover: string[];
}

/**
 * One timeline, two halves, told apart by `kind`.
 *
 * A lockout is rendered as a lockout and never as a suspension, because a
 * school reading one as the other believes its teacher was disciplined for
 * mistyping a password.
 */
export type StaffHistoryEntry =
  | ({ kind: "employment"; at: string } & Omit<StaffEmploymentEvent, "reason" | "note"> & { reason?: string; note?: string })
  | {
      kind: "account";
      at: string;
      event: string;
      label: string;
      /** The administrator's note on an email change; empty otherwise. */
      note?: string;
      actor: StaffActor | null;
    };

export type StaffHistorySection =
  | "overview" | "teaching" | "access" | "qualifications" | "documents" | "leave";

export interface StaffSectionChange {
  field: string;
  before: string | null;
  after: string | null;
}

export interface StaffSectionHistoryEntry {
  id: number;
  at: string;
  title: string;
  action: "Added" | "Changed" | "Removed" | "Recorded";
  actor: string | null;
  changes: StaffSectionChange[];
}

export interface StaffSectionHistoryPage {
  entries: StaffSectionHistoryEntry[];
  next_page: number | null;
}

// ── Roles and reach ────────────────────────────────────────────────────────

export interface StaffGrant {
  id: number;
  role: string;
  role_key: string;
  school_wide: boolean;
  branch_id: number | null;
  branch_ids: number[];
  branch_name: string;
  granted_at: string;
  granted_by: StaffActor | null;
}

export interface StaffRevokedGrant extends StaffGrant {
  revoked_at: string;
  revoked_by: StaffActor | null;
  reason: string;
}

/**
 * A grant waiting on the approval ladder.
 *
 * A role carrying restricted permissions its granter does not hold is
 * requested rather than written, and confers nothing until approved. The
 * requester may approve their own when nobody else can.
 */
export interface StaffPendingGrant {
  id: number;
  status: "PENDING";
  user_id: number;
  role_key: string;
  role_name: string;
  branch_id: number | null;
  branch_name: string;
  replaces_id: number | null;
  replaces_role_name: string | null;
  reason_note: string;
  requested_by_name: string;
  submitted_at: string;
}

/**
 * A person's grants and what they reach.
 *
 * Reach is derived from branch-pinned grants and never stored on the person, so
 * it can be wider than their posting. An empty `branches` where somebody holds
 * only withdrawn branch grants is a real answer, meaning they reach the
 * school-wide rows and nothing else, and must not be drawn as no narrowing.
 *
 * `overrides` is **absent entirely** for a caller without
 * `school.user_overrides.view`, rather than empty: an empty block would say
 * "there are none here", which is the fact the restriction exists to withhold.
 */
export interface StaffRoles {
  roles: StaffGrant[];
  /** Waiting for approval; listed apart because they confer nothing yet. Absent from a server older than the grant ladder. */
  pending?: StaffPendingGrant[];
  revoked: StaffRevokedGrant[];
  reach: {
    school_wide: boolean;
    note: string;
    branches: { id: number; name: string; via: string }[];
  };
  overrides?: {
    permission: string;
    mode: "ALLOW" | "DENY";
    reason: string;
    expires_at: string | null;
  }[];
}

// ── Posting and reach ──────────────────────────────────────────────────────

/**
 * A branch's roster, in three labelled groups and never one flat list.
 *
 * Posted here, reaching here through a role, and school-wide are three
 * different facts. Only the first is `movable`, because a posting is the only
 * one of the three this screen can change.
 */
export interface StaffRoster {
  branch: { id: number; name: string };
  total: number;
  groups: {
    key: "posted_here" | "reaching_here" | "school_wide";
    title: string;
    note: string;
    movable: boolean;
    /**
     * Where a group that cannot be moved here IS changed, empty for one that
     * can. Saying only that a group is not this screen's to move tells a
     * reader they cannot do the thing without telling them who can.
     */
    change_it: string;
    /**
     * Rows carry `via_roles` in the reaching group and nowhere else: the roles
     * that bring that person to this branch. Per person rather than per group,
     * because it differs per person and one sentence over the group could name
     * nobody's.
     *
     * `school_wide` separates the two cases, which need different acts. A
     * pinned role is unpinned and the person stops reaching this branch. A
     * school-wide one reaches every branch by being pinned to none, so
     * narrowing it takes them off every other branch's roster too.
     */
    rows: (StaffListRow & {
      via_roles?: { name: string; school_wide: boolean }[];
    })[];
  }[];
}

export interface StaffBulkPosting {
  staff_ids: number[];
  /** Empty is an explicit school-wide posting. */
  branch_ids: number[];
  reason?: string;
}

/**
 * The move, and what it did not do.
 *
 * `role_grants_touched` is always false and is worth rendering: moving somebody
 * changes where they are based and nothing about which branches their roles
 * reach. A warning names the classes somebody still teaches at the branch they
 * have left, because moving them does not cancel those assignments.
 */
export interface StaffBulkPostingResult {
  moved: number;
  role_grants_touched: boolean;
  warnings: {
    code: "ASSIGNMENTS_LEFT_BEHIND";
    staff_id: number;
    message: string;
    classes: string[];
  }[];
}

export interface StaffBulkRole {
  staff_ids: number[];
  /** A role KEY. */
  role: string;
  /** A branch id, or null for a school-wide grant. */
  branch: string | null;
}

/** Anybody who already held the grant is named rather than silently skipped. */
export interface StaffBulkRoleResult {
  role: { id: number; key: string; name: string };
  reach: string;
  granted: StaffActor[];
  already_held: StaffActor[];
  /** A restricted role the granter does not hold waits, one request each. Absent from a server older than the grant ladder. */
  pending_approval?: StaffActor[];
}

// ── Teaching ───────────────────────────────────────────────────────────────

export interface TeachingAssignment {
  id: number;
  staff_id: number;
  staff_name: string;
  subject_id: number;
  subject_name: string;
  school_class_id: number;
  class_name: string;
  session_id: number;
  part: TeachingPart;
  part_label: string;
  created_at: string;
}

export interface StaffTeaching {
  session: { id: number; name: string };
  assignments: TeachingAssignment[];
  load: number;
  load_note: string;
}

export interface TeachingWrite {
  school_class: number;
  subject: number;
  session?: number;
  part?: TeachingPart;
}

/** One class-and-subject pairing, and who covers it. */
export interface CoverageCell {
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  lead: { assignment_id: number; staff_id: number; name: string } | null;
  assistants: { assignment_id: number; staff_id: number; name: string }[];
  /** Nobody teaches it. */
  gap: boolean;
  /** Assistants, and no lead. Being taught, and nobody owns the marks. */
  lead_gap: boolean;
}

/**
 * What has a teacher, and what does not.
 *
 * The two gap counts are kept apart because they are different problems. This
 * is the one genuinely computable warning in the module, because it counts
 * rows: it says nothing about whether the assigned teacher is a good choice or
 * whether anybody is overloaded, and no screen may imply otherwise.
 */
export interface TeachingCoverage {
  success: boolean;
  message: string;
  pagination: Pagination;
  data: CoverageCell[];
  session: { id: number; name: string };
  coverage_gaps: number;
  lead_gaps: number;
  headline: string;
}

export interface ClassTeacherWrite {
  school_class: number;
  /** Null clears the designation, which a school does when somebody leaves. */
  staff: number | null;
}

/**
 * The designation lives on the class, not on an assignment.
 *
 * **This is the only way to read it.** No class serializer exposes
 * `SchoolClass.class_teacher`, so the current holder is knowable only from what
 * a write returns. The Class teachers panel needs that field on the academics
 * classes read before it can be built.
 */
export interface ClassTeacherResult {
  school_class: { id: number; name: string };
  class_teacher: StaffActor | null;
}

// ── Leave ──────────────────────────────────────────────────────────────────

export interface StaffLeaveRequest {
  id: number;
  staff_id: number;
  staff_name: string;
  leave_type: LeaveType;
  leave_type_label: string;
  start_date: string;
  end_date: string;
  /** The school's working days in the range, less its closures. */
  days: number;
  /**
   * Days past the type's allowance for the session, counting approved and
   * pending leave, when the request was filed or re-dated. 0 within it or
   * where the type has no limit.
   */
  over_allowance_by?: number;
  note: string;
  status: LeaveStatus;
  /**
   * Four stored values and one derived: `COMPLETED` once the end date passes.
   *
   * A CODE, like `status`, and not a label - the server derives it rather than
   * looking it up, so there is no `get_..._display` behind it and nothing sends
   * a sentence-case version. Screens supply their own wording.
   */
  display_status: LeaveStatus | "COMPLETED";
  decided_at: string | null;
  requested_by: StaffActor | null;
  created_at: string;
  /** The active workflow step and its frozen list of eligible approvers. */
  approval?: {
    instance_id: string | null;
    stage: string | null;
    pending_with: string[];
  };
  /** The last administrator correction or cancellation, when present. */
  last_changed_by?: StaffActor | null;
  last_changed_at?: string | null;
}

/**
 * One leave type's standing in one academic session.
 *
 * `taken` sums approved requests and `pending` those waiting for a decision.
 * `remaining` is the allowance less both, negative once an approver has let a
 * request past it, and null with `allowance` where the type has no limit.
 */
export interface StaffLeaveBalance {
  leave_type: LeaveType;
  label: string;
  allowance: number | null;
  taken: number;
  pending: number;
  remaining: number | null;
}

/** The academic session a set of balances counts against. */
export interface StaffLeaveSession {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

/**
 * Somebody's leave, and where they stand against the school's allowances.
 *
 * `balances` covers every leave type for `balance_session`: the session
 * covering today (or the as-at day), else the active one, or the one named by
 * `?session=`. Both are empty where the school has no session to count
 * against. `days_taken` is approved leave across every session.
 * `balance_note` is the server's sentence explaining the figures.
 */
export interface StaffLeave {
  leave: StaffLeaveRequest[];
  /** Per type, summed from approved requests only, across every session. */
  days_taken: { leave_type: LeaveType; days: number }[];
  balances: StaffLeaveBalance[];
  balance_session: StaffLeaveSession | null;
  balance_note: string;
}

/**
 * What a form may send. Deliberately without `status`.
 *
 * A status a form can set is a status that disagrees with the instance that
 * decided it. The workflow handler writes it and nothing else does.
 */
export interface StaffLeaveWrite {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days?: number;
  note?: string;
}

/**
 * What filing warns about without refusing. `message` is the whole sentence.
 *
 * Overlapping leave names the requests it clashes with. Leave past the type's
 * allowance for the session is filed anyway, with the days over, for the
 * approver to decide.
 */
export type StaffLeaveWarning =
  | { code: "LEAVE_OVERLAP"; message: string; leave_ids: number[] }
  | { code: "OVER_ALLOWANCE"; message: string; over_allowance_by: number };

export interface StaffLeaveFiled {
  leave: StaffLeaveRequest;
  warnings: StaffLeaveWarning[];
}

// ── Search ─────────────────────────────────────────────────────────────────

/**
 * A palette hit. Capped at ten and **carries no email address**: this is the
 * most casually visible surface in the module.
 */
export interface StaffSearchHit {
  id: number;
  name: string;
  meta: string;
  employment_status: EmploymentStatus;
}

// ── Envelope aliases ───────────────────────────────────────────────────────

export type StaffEnvelope<T> = Envelope<T>;

/**
 * The school's staff ID rule (`/v1/i/me/staff/number-policy/`), the same
 * shape as the admission-number rule: required or not, a pattern, the hint
 * the Add form prints, and whether the next number is issued automatically.
 * A branch may keep its own. A staff ID is also a sign-in identifier.
 */
export type StaffNumberPolicy = AdmissionPolicy;

/** A value and the words a screen prints for it. */
export interface StaffOption {
  value: string;
  label: string;
}

/**
 * The school's own staff rules (`/v1/i/me/staff/rules/`).
 *
 * Every value here defaults to how XVS behaved before a school could choose:
 * new staff start as Teacher, no document is expected, staff edit the same
 * four details of their own record, a hire is invited without approval, and
 * no leave type has an allowance. `self_editable_locked` lists the details a
 * school can never open to self-edit (staff ID, job title and the like).
 */
export interface StaffRules {
  starting_role: string;
  starting_role_options: StaffOption[];
  required_documents: string[];
  document_types: StaffOption[];
  self_editable_fields: string[];
  self_editable_options: StaffOption[];
  self_editable_locked: StaffOption[];
  hire_requires_approval: boolean;
  leave: {
    /** Days per leave type in one academic session; null is no limit. */
    allowances: Record<string, number | null>;
    leave_types: StaffOption[];
    /** ISO weekdays that count as working days, 1 is Monday. */
    working_days: number[];
    /** Whether days the school is closed are left out of a leave request. */
    exclude_closures: boolean;
  };
}

export type StaffRulesUpdate = Pick<
  StaffRules,
  "starting_role" | "required_documents" | "self_editable_fields" | "hire_requires_approval"
> & {
  leave: Pick<StaffRules["leave"], "allowances" | "working_days" | "exclude_closures">;
  reason?: string;
};
