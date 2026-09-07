import type {
  Envelope,
  Pagination,
} from "../onboarding/onboarding-types";

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

// ── Vocabularies ───────────────────────────────────────────────────────────

/** Does this person still work here. Set only by a logged transition. */
export type EmploymentStatus =
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
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "VOLUNTEER";

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
  email: string;
  staff_number: string;
  job_title: string;
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
  employment_type: EmploymentType | "";
  account_status: AccountStatus;
  account_flag: StaffAccountFlag | null;
  /** Every distinct role name they hold, de-duplicated and sorted. */
  roles: string[];
  branch_id: number | null;
  /**
   * `null` at a single-branch school, where the dimension recedes entirely
   * rather than repeating one value on every row. `"School-wide"` for somebody
   * with no single base.
   */
  branch_name: string | null;
  /** `null` at a single-branch school, for the same reason. */
  posted_school_wide: boolean | null;
  /** A count of assignments. There is no target to compare it against. */
  teaching_load: number;
  /**
   * Approved leave covering today. The reason `display_employment_status` and
   * `employment_status` differ, and the only reason they can.
   */
  on_leave_today: boolean;
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
export interface StaffDetail extends StaffListRow {
  account: StaffAccountState;
  middle_name: string;
  date_of_birth: string | null;
  phone: string;
  gender: string;
  photo_url: string | null;
  exit_date: string | null;
  tenure: StaffTenure | null;
  lifecycle: StaffLifecycle;
  counts: {
    qualifications: number;
    documents: number;
    teaching_assignments: number;
    leave_requests: number;
  };
  created_by: StaffActor | null;
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
  /** A role KEY from `role_options`. There is no invite-now-decide-later. */
  role: string;
  /** A branch id for a branch-pinned grant, or omitted for school-wide. */
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
  | ({ kind: "employment"; at: string } & StaffEmploymentEvent)
  | {
      kind: "account";
      at: string;
      event: string;
      label: string;
      actor: StaffActor | null;
    };

// ── Roles and reach ────────────────────────────────────────────────────────

export interface StaffGrant {
  id: number;
  role: string;
  role_key: string;
  school_wide: boolean;
  branch_id: number | null;
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
  revoked: StaffRevokedGrant[];
  reach: {
    school_wide: boolean;
    note: string;
    branches: { id: number; name: string; via: string }[];
  };
  overrides:
    | {
        permission: string;
        mode: "ALLOW" | "DENY";
        reason: string;
        expires_at: string | null;
      }[]
    | null;
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
    rows: StaffListRow[];
  }[];
}

export interface StaffBulkPosting {
  staff_ids: number[];
  /** A branch id, or null for across the whole school. */
  branch: string | null;
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
  days: number;
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
}

/**
 * Somebody's leave, and how much of it has been taken.
 *
 * `balance_note` is the server saying in words that there is no balance:
 * nothing anywhere records an entitlement to count against. Render it beside
 * `days_taken` rather than leaving a bare number to be read as one.
 */
export interface StaffLeave {
  leave: StaffLeaveRequest[];
  /** Per type, summed from approved requests only. */
  days_taken: { leave_type: LeaveType; days: number }[];
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

/** Overlapping leave warns and does not refuse. `message` is the whole sentence. */
export interface StaffLeaveWarning {
  code: "LEAVE_OVERLAP";
  message: string;
  leave_ids: number[];
}

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
