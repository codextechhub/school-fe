import type { AsAtMeta } from "@/lib/as-at";

/**
 * Shapes returned by /v1/students/ and /v1/guardians/.
 *
 * Three rules from the backend's own serializers run through all of them, and
 * the types say so rather than leaving a reader to discover them:
 *
 *   1. The branch dimension RECEDES at a single-branch school. `branch` and
 *      `branch_name` are dropped from the payload entirely - not nulled - so
 *      both are optional here. A screen must read "absent" as "this school has
 *      one branch", never as "no branch set". Verified against the seeded
 *      sunrise-academy, which returns neither key.
 *
 *   2. Enums come back as CODES with a `*_label` beside them. Render the label;
 *      compare on the code. Never build a label from the code in a screen, or
 *      two screens will spell the same status differently.
 *
 *   3. There is no per-session anything here except the class placement. A
 *      student's status, branch, guardians and documents are all current-state,
 *      so nothing in this file is scoped to a year. See section 2.0 of
 *      docs/students-design-phases.md for why that settles the session pill.
 */

/** Present on every row at a multi-branch school; absent entirely otherwise. */
export interface StudentScoped {
  branch?: number;
  branch_name?: string;
}

export type StudentStatus =
  | "APPLICANT"
  | "ENROLLED"
  | "ACTIVE"
  | "SUSPENDED"
  | "GRADUATED"
  | "TRANSFERRED"
  | "WITHDRAWN"
  | "REJECTED";

export type Gender = "FEMALE" | "MALE";

/** The directory row. No medical field and no guardian contact detail is in it. */
export interface StudentRow extends StudentScoped {
  id: number;
  student_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  status: StudentStatus;
  status_label: string;
  /** "" when the student is not in a class. Not null. */
  class_name: string;
  /** The class's level, or the level applied for when there is no class yet. */
  level_name: string;
  /** The primary contact's name only, or "" when nobody is linked. */
  primary_guardian: string;
  photo_url: string;
  enrolment_date: string | null;
  /**
   * When an applicant applied. Null for anyone already on the roll.
   *
   * On the ROW rather than the detail because two screens sort on it - the
   * applicants board and the directory's work queue - and reaching it per row
   * would have been a request per applicant.
   */
  applied_on: string | null;
  /** The school's own admission stage an applicant is at; null before any. */
  admission_stage?: number | null;
  admission_stage_name?: string;
  stage_entered_on?: string | null;
  /** Set while the applicant sits at an offer stage. */
  offer_expires_on?: string | null;
  /** The offer's window has passed and nobody has acted: a person decides. */
  offer_expired?: boolean;
}

/**
 * One move the state machine will accept from where this student stands.
 *
 * Served per student rather than derived on the client, so the drawer can never
 * offer a transition the backend refuses, and the impact sentence under each
 * option is the backend's own wording rather than a second copy of the rule.
 */
export interface AllowedTransition {
  status: StudentStatus;
  label: string;
  impact: string;
  /** Transfers out need a destination school; nothing else does. */
  needs_destination: boolean;
}

/**
 * One student's record.
 *
 * Every optional personal field is a Field Access field of `school.students`:
 * absent, never empty, when the viewer may not read it, so "" still means
 * "nothing recorded". `full_name` is rebuilt from the name parts the viewer may
 * read. Read as at an earlier day, the record carries `as_at`.
 */
export interface StudentDetail extends StudentScoped {
  id: number;
  student_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  full_name: string;
  date_of_birth?: string;
  /** Computed by the server, so two screens cannot disagree about a birthday. */
  age: number | null;
  gender?: Gender | "";
  nationality?: string;
  state_of_origin?: string;
  address?: string;
  phone?: string;
  email?: string;
  previous_school?: string;
  blood_group?: string;
  allergies?: string;
  conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  status: StudentStatus;
  status_label: string;
  enrolment_date?: string | null;
  /** Fields present in this record that the viewer may not change. */
  _read_only_fields?: string[];
  class_name: string;
  level_name: string;
  session_name: string;
  applied_for: number | null;
  applied_for_name: string;
  applied_on: string | null;
  photo_url?: string;
  allowed_transitions: AllowedTransition[];
  created_at: string;
  updated_at: string;
  /** The first day this record can be read as at; null before it is first recorded. */
  history_starts: string | null;
  /** Present only on a record read as at an earlier day. */
  as_at?: AsAtMeta;
}

export interface StudentSummary {
  /**
   * True when a year lens is applied, so the status counts describe THIS
   * YEAR'S students as they stand TODAY rather than as they stood then.
   */
  status_is_current?: boolean;
  total: number;
  on_roll: number;
  active: number;
  applicants: number;
  unassigned: number;
  by_status: { status: StudentStatus; label: string; count: number }[];
  /**
   * The classes nearest their capacity.
   *
   * The backend returns at most THREE, and only classes with five or fewer
   * seats free, so this is legitimately empty at a half-full school. The
   * design's panel wants the fullest four at any load - until the backend ask
   * lands, the empty case must read as "no class is near capacity" and never
   * as "no class holds any students".
   */
  nearest_capacity: {
    id: number;
    name: string;
    used: number;
    capacity: number;
    remaining: number;
  }[];
  session: string;
}

/**
 * A guardian's own details. Phone, email, occupation and address are Field
 * Access fields (`school.guardians`), absent when the viewer may not read them.
 */
export interface GuardianSummary {
  id: number;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  /** The name was split from one line and nobody has confirmed the parts yet. */
  name_needs_review: boolean;
  phone?: string;
  email?: string;
  occupation?: string;
  address?: string;
  /** Whether the guardian has a login of their own. */
  has_account: boolean;
  /** "" when the school holds none, which is the ordinary case. */
  photo_url?: string;
}

/** One guardian as they relate to ONE student. */
export interface StudentGuardianLink {
  id: number;
  guardian: GuardianSummary;
  relationship: string;
  relationship_label: string;
  is_primary: boolean;
  /** The guardian's other children at this school. Empty for an only child. */
  siblings: { id: number; name: string; class: string }[];
}

export interface StudentSubject {
  id: number;
  name: string;
  code: string;
  is_core: boolean;
}

export interface ClassHistoryRow {
  id: number;
  session_name: string;
  class_name: string;
  effective_date: string | null;
  /** Null while this is the current placement. */
  ended_at: string | null;
}

export type DocumentType =
  | "BIRTH_CERTIFICATE"
  | "REPORT_CARD"
  | "PASSPORT_PHOTO"
  | "TRANSFER_CERTIFICATE"
  | "IMMUNISATION";

/**
 * A checklist, not a file list: every type appears, attached or not.
 *
 * So a missing required document is a row that says so, rather than an absence
 * the screen has to infer by diffing against a list it holds itself.
 */
export interface StudentDocumentRow {
  document_type: DocumentType;
  label: string;
  required: boolean;
  attached: boolean;
  uploaded_at: string | null;
  /** Null when nothing is attached. */
  id: number | null;
  /** "" when nothing is attached. */
  url: string;
  /** Held on the day a past view reads, and replaced or removed since. */
  file_retired?: boolean;
}

export type HistoryKind = "status" | "class" | "guardian" | "document" | "edit";

/** The profile's History tab: the status log and the audit trail, merged. */
export interface HistoryEntry {
  kind: HistoryKind;
  text: string;
  when: string;
  /** A name, never an email address, and "System" for automated moves. */
  actor: string;
}

/**
 * One hit in the student type-ahead.
 *
 * Four fields, deliberately: the backend refuses to put an address or a
 * guardian's number into a list that appears under somebody's cursor.
 */
export interface StudentSearchHit {
  id: number;
  full_name: string;
  student_number: string;
  /** "" when the student is not in a class. */
  class_name: string;
}

/** One guardian hit in the command palette.
 *
 *  Three fields, and no phone, email or photograph: the directory row carries
 *  those and this opens in a dropdown on the second keystroke, over whatever
 *  page the reader is on. Who, and whose children - the rest is on the record.
 */
export interface GuardianSearchHit {
  id: number;
  full_name: string;
  /** Narrowed to the branches the caller covers, so it can be empty. */
  ward_names: string[];
}

/** The guardian directory row. Phone and email are absent when the viewer may not read them. */
export interface GuardianRow {
  id: number;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  name_needs_review: boolean;
  phone?: string;
  email?: string;
  ward_count: number;
  ward_names: string[];
  /** More than one child at this school, so the row stands for a household. */
  is_sibling_household: boolean;
  /** "" when the school holds none, which is the ordinary case. */
  photo_url?: string;
}

export interface GuardianDetail extends GuardianSummary {
  history_starts: string | null;
  as_at?: AsAtMeta;
  wards: {
    id: number;
    name: string;
    student_number: string;
    status: StudentStatus;
    status_label: string;
    class_name: string;
    relationship: string;
    /** The school's own word where it set one, otherwise the choice's label. */
    relationship_label?: string;
    is_primary: boolean;
  }[];
}

export type PromotionOutcome = "PROMOTE" | "REPEAT" | "GRADUATE" | "HOLD";

/** Why a class or a student is not simply moving up. A fixed vocabulary. */
export type PromotionCause =
  | "TERMINAL_LEVEL"
  | "NO_CLASS_AT_NEXT_LEVEL"
  | "LEVEL_NOT_WIRED"
  | "STUDENT_SUSPENDED"
  | "NO_CLASS_ASSIGNED"
  | "NO_CLASS_TO_REPEAT";

export interface PromotionPlan {
  from_session: string;
  to_session: string;
  counts: {
    promote: number;
    repeat: number;
    graduate: number;
    hold: number;
    candidates: number;
    excluded: number;
  };
  /**
   * One row per source class.
   *
   * `terminal` means the level SAYS pupils leave after it. A class with no
   * target that is not terminal is a level nobody has wired, which is a
   * different thing and reads as "not set" rather than "Graduates".
   */
  level_map: {
    from: string;
    from_id: number;
    to: string | null;
    to_id: number | null;
    /**
     * The classes receiving this class's promoted pupils, with how many each.
     * One under "same arm"; several when the school spreads a year group.
     * Absent from a server older than the promotion rules.
     */
    to_classes?: { id: number; name: string; students: number }[];
    terminal: boolean;
    students: number;
    /**
     * True when no class at the next level has this class's arm, so its
     * promoted pupils are shared across that level's classes instead of moving
     * up whole. Absent from a server that does not report it.
     */
    arm_fallback?: boolean;
    /** The server's sentence for that case, printed as written when present. */
    arm_note?: string | null;
  }[];
  /** The school's promotion rules this plan was worked out under. */
  rules?: Pick<PromotionRules, "suspended" | "not_placed" | "arms">;
  /**
   * Target classes the run would fill past their capacity. The run refuses
   * them (PROMOTION_OVER_CAPACITY) until it is sent `allow_over_capacity`.
   * Absent from a server older than that rule, so read it as optional.
   */
  /** How this school treats a full class; HARD means no acknowledgement helps. */
  capacity_mode?: CapacityMode;
  over_capacity?: {
    class: number;
    class_name: string;
    capacity: number;
    used: number;
    adding: number;
    over_by: number;
  }[];
  /**
   * Class-wide causes collapse to one row however many students they cover;
   * per-student causes get one each. Repeating a class-wide cause per student
   * would bury the rows that actually need a decision.
   */
  exceptions: {
    by_class: {
      class: number;
      class_name: string;
      cause: PromotionCause;
      reason: string;
      students: number;
    }[];
    by_student: {
      student: number;
      name: string;
      class: string;
      cause: PromotionCause;
      reason: string;
    }[];
  };
  students: {
    id: number;
    name: string;
    student_number: string;
    from_class: string;
    from_class_id: number;
    to_class: string | null;
    outcome: PromotionOutcome;
    /** Moving with the year group while suspended, under the school's rule. */
    suspended?: boolean;
  }[];
}

/** What a completed run did. */
export interface PromotionBatch {
  id: number;
  from_session_name: string;
  to_session_name: string;
  total: number;
  promoted: number;
  repeated: number;
  graduated: number;
  held: number;
  excluded: number;
  failed: number;
  created_at: string;
}

/**
 * One class with its live seat count.
 *
 * Scoped to the active year by the server. A school has one JSS1 A per session
 * and they are all called JSS1 A, so a picker showing two would be offering an
 * option the server refuses on save.
 */
export interface ClassSeats {
  id: number;
  name: string;
  /** Null means school-wide; absent at a single-branch school. */
  branch: number | null;
  branch_name: string | null;
  level: number | null;
  level_name: string;
  /**
   * Where the level sits on the ladder, as [programme, level].
   *
   * A tuple because each programme numbers its own levels from 1 - JSS1 and
   * SSS1 are both 1 - so the programme has to break the tie or the two ladders
   * interleave into JSS1, SSS1, JSS2, SSS2.
   */
  level_order: [number, number] | null;
  /** Null means no limit recorded, which is not the same as full. */
  capacity: number | null;
  used: number;
  /** Null whenever `capacity` is. */
  remaining: number | null;
}

/**
 * The school's own admission-number rule, or one branch's.
 *
 * Read with `?branch=` it is that branch's rule: its own values where it has
 * set them, the school's where it has not (`source` says which). A number is
 * unique across the whole school whichever branch's rule it follows.
 */
export interface AdmissionPolicy {
  required: boolean;
  /** An anchored regular expression, or "" when the school has set no rule. */
  pattern: string;
  hint: string;
  /**
   * The next number in this school's own series, or "" for no suggestion.
   *
   * Derived from the numbers already issued, not from `pattern` - a regular
   * expression cannot be inverted. It is a suggestion and NOT a reservation:
   * two registrars enrolling at once can be handed the same one, and the
   * server's unique constraint is what prevents the collision.
   */
  suggestion: string;
  /** Issue the next number automatically when enrolment leaves it blank. */
  auto_issue?: boolean;
  /** Where the rule read came from. Absent from an older server. */
  source?: "branch" | "school" | "default";
}

/** A value and the words a school reads for it. */
export interface LabelledOption {
  value: string;
  label: string;
}

/**
 * How full a class may get.
 *
 * WARN refuses a full class until the person enrolling says to go ahead; HARD
 * refuses it outright; OFF never checks.
 */
export type CapacityMode = "WARN" | "HARD" | "OFF";

/**
 * The school's own rules for enrolling a child: `/v1/students/enrolment-rules/`.
 *
 * Read by every form that enrols or edits a child, so the browser refuses what
 * the server will refuse, and set in Settings > Enrolment.
 */
export interface EnrolmentRules {
  min_age_years: number;
  max_age_years: number;
  /** Document types a school is prompted for. A prompt, never a gate. */
  required_documents: string[];
  document_types: LabelledOption[];
  /** Fields from `optional_fields` this school requires at enrolment. */
  required_fields: string[];
  optional_fields: LabelledOption[];
  capacity_mode: CapacityMode;
  /** Given to a new class created without a capacity; null means unlimited. */
  default_capacity: number | null;
}

/**
 * The school's own rules for guardians: `/v1/students/guardian-rules/`.
 *
 * `relationships` is the whole list a picker offers: the fixed ones, then the
 * school's own (whose value is the word itself), then Other.
 */
export interface GuardianRules {
  min_per_student: number;
  email_required: boolean;
  matching: "EMAIL_THEN_PHONE" | "EMAIL_ONLY";
  matching_options: LabelledOption[];
  extra_relationships: string[];
  relationships: LabelledOption[];
}

/** One step of a school's own admissions, in its order. */
export interface AdmissionStage {
  id: number;
  name: string;
  position: number;
  /** An offer the family has `offer_valid_days` to accept. */
  is_offer: boolean;
  offer_valid_days: number | null;
  /** Applicants at this stage now, in the reader's branches. */
  applicants: number;
}

/**
 * The school's admission rules: `/v1/students/admission-rules/`.
 *
 * No stages means a school admits on the spot, as it always could.
 */
export interface AdmissionRules {
  stages: AdmissionStage[];
  required_documents_to_confirm: string[];
  document_types: LabelledOption[];
}

export interface AdmissionRulesUpdate {
  /** The whole ordered list; a stage left out is removed. */
  stages: { id?: number; name: string; is_offer: boolean; offer_valid_days: number | null }[];
  required_documents_to_confirm: string[];
  reason?: string;
}

/**
 * The school's promotion rules (`/v1/students/promotion-rules/`).
 *
 * `capacity_mode` is promotion's own rule; `FOLLOW_ENROLMENT` means promotion
 * treats a full class exactly as enrolment does, and `effective_capacity_mode`
 * is what that resolves to today.
 */
export interface PromotionRules {
  suspended: PromotionHoldOrMove;
  not_placed: PromotionHoldOrMove;
  arms: PromotionArms;
  capacity_mode: PromotionCapacityMode;
  effective_capacity_mode: CapacityMode;
  enrolment_capacity_mode: CapacityMode;
  options: {
    suspended: LabelledOption[];
    not_placed: LabelledOption[];
    arms: LabelledOption[];
    capacity_mode: LabelledOption[];
  };
}

export type PromotionHoldOrMove = "HOLD" | "PROMOTE";
export type PromotionArms = "SAME_ARM" | "SPREAD";
export type PromotionCapacityMode = "FOLLOW_ENROLMENT" | CapacityMode;

export type PromotionRulesUpdate = Pick<
  PromotionRules,
  "suspended" | "not_placed" | "arms" | "capacity_mode"
> & { reason?: string };

export type GuardianRulesUpdate = Pick<
  GuardianRules,
  "min_per_student" | "email_required" | "matching" | "extra_relationships"
> & { reason?: string };

export type EnrolmentRulesUpdate = Omit<
  EnrolmentRules,
  "document_types" | "optional_fields"
> & { reason?: string };

/**
 * The editable half of a student record.
 *
 * **Class and status are absent, and that is the contract, not an omission.**
 * Each moves through its own endpoint so it keeps its reason, its effective
 * date and its own audit line: the record has to be able to answer why a child
 * left a class, and a PATCH that quietly changed it could not. The backend's
 * write serializer refuses both, and so does this type.
 *
 * `branch` is refused explicitly too - a school that types a branch and gets a
 * 200 believes the student moved.
 *
 * The medical fields and `enrolment_date` are Field Access fields
 * (`school.students`): sending one the viewer may not write is a 403
 * `field_write_denied`, not a silent drop, so a form sends only what changed
 * and only what it may write.
 */
export interface StudentWrite {
  student_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  nationality: string;
  state_of_origin: string;
  address: string;
  phone: string;
  email: string;
  previous_school: string;
  blood_group: string;
  allergies: string;
  conditions: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  enrolment_date: string;
}

/**
 * What happened to ONE student in a bulk action.
 *
 * Never all-or-nothing: a caller who selected twenty and mistyped one should
 * not lose the nineteen. `ok` is per row, and a false one carries the reason.
 */
export interface BulkResultRow {
  student: number;
  /** "" when the id matched no student at this school. */
  name: string;
  ok: boolean;
  code: string;
  message: string;
}

/** One guardian on an enrolment: either an existing id, or a new name and phone. */
export interface GuardianOnEnrolment {
  guardian_id?: number;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  relationship: string;
  is_primary: boolean;
}

/**
 * Enrolling a student, or saving them as an applicant.
 *
 * One shape with a flag rather than two, mirroring the backend: two payloads
 * would be two sets of rules, and the second would be the one that forgets the
 * duplicate check.
 *
 * The flag decides which of two fields is required. An enrolment needs
 * `school_class` - a child joining the school joins a class. An applicant needs
 * `applied_for`, a LEVEL, because they have not been placed in anything yet and
 * recording a class for them would claim a seat nobody gave them.
 *
 * `student_number` is optional here even though the design treats it as
 * required. Whether a school issues one, and in what format, is the school's
 * own rule and lives in the admission policy - see AdmissionPolicy.
 */
export interface EnrolWrite {
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  nationality?: string;
  state_of_origin?: string;
  address?: string;
  phone?: string;
  email?: string;
  previous_school?: string;
  blood_group?: string;
  allergies?: string;
  conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  student_number?: string;
  enrolment_date?: string;
  /** Required unless `as_applicant`. */
  school_class?: number | null;
  /** A LEVEL id. Required when `as_applicant`. */
  applied_for?: number | null;
  as_applicant?: boolean;
  /** Acknowledgements, never preferences. Send false and let the server ask. */
  allow_over_capacity?: boolean;
  confirm_duplicate?: boolean;
  guardians: GuardianOnEnrolment[];
}

/** The eight the backend accepts. An aunt recorded as OTHER is a contact the
 *  school cannot tell from a neighbour, and it knew which when it typed her in. */
export const RELATIONSHIPS = [
  { value: "MOTHER", label: "Mother" },
  { value: "FATHER", label: "Father" },
  { value: "UNCLE", label: "Uncle" },
  { value: "AUNT", label: "Aunt" },
  { value: "GRANDPARENT", label: "Grandparent" },
  { value: "LEGAL_GUARDIAN", label: "Legal guardian" },
  { value: "SIBLING", label: "Sibling" },
  { value: "OTHER", label: "Other" },
] as const;

/** Why a student moved class. Sent as the code, shown as the label. */
export const TRANSFER_REASONS = [
  { value: "PARENT_REQUEST", label: "Parent request" },
  { value: "STREAM_CHANGE", label: "Stream change" },
  { value: "CLASS_BALANCING", label: "Class balancing" },
  { value: "BEHAVIOUR", label: "Behaviour" },
  { value: "ACADEMIC_PLACEMENT", label: "Academic placement" },
  { value: "OTHER", label: "Other" },
] as const;

/** What the directory sends up. Every value is optional; "all" means unset. */
export interface StudentListArgs {
  search?: string;
  /** A class id, or the literal "unassigned" for on-roll students with none. */
  class?: string | number;
  level?: string | number;
  status?: StudentStatus | "ALL";
  /** Omitted at a single-branch school, and when the lens reads "all". */
  branch?: number;
  /**
   * The year to read the roll in.
   *
   * Changes WHICH students are listed and WHICH class each one shows - both are
   * per-year. It does not change their status, which has no year; the summary
   * flags that back as `status_is_current`.
   */
  session?: number;
  /** An admission stage id, or "none" for applicants at no stage yet. */
  stage?: number | "none";
  page?: number;
}
