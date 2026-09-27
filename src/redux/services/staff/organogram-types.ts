/**
 * The school's organogram, at `/v1/i/me/staff/organogram/`.
 *
 * Built on posts rather than people: an org unit (DIVISION -> DEPARTMENT ->
 * TEAM) holds posts, a post reports to another post along a solid line, and a
 * member of staff fills a post through an effective-dated appointment. A post
 * whose holder leaves stays on the chart, vacant, with its reports still under
 * it, so whoever is appointed next inherits them.
 *
 * An org unit is school-wide or belongs to one branch, and a post takes its
 * unit's branch. Every member of staff reads the whole school's chart; a branch
 * administrator changes only their own branch's part of it, which each row
 * reports as `can_manage`.
 *
 * Read representations nest inline objects; writes take `*_id` fields.
 */

export type OrgNodeKind = "DIVISION" | "DEPARTMENT" | "TEAM";

export interface BranchInline {
  id: number;
  name: string;
}

/**
 * A member of staff as the chart shows them.
 *
 * `id` is the user id, which is how the chart recognises the signed-in viewer
 * and keys acting flags; `staff_id` is the staff record, which is where a card
 * links to. No email, phone or leave: every colleague reads this shape.
 */
export interface StaffHolder {
  id: string;
  staff_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  photo: string | null;
  job_title: string;
  /**
   * Their employment or their account is suspended. They keep their post on
   * the chart, marked, and are passed over as an approver until it is lifted.
   */
  is_suspended: boolean;
}

export interface OrgNodeInline {
  id: number;
  name: string;
  code: string;
  kind: OrgNodeKind;
}

export interface PositionInline {
  id: number;
  title: string;
  code: string;
  org_node: OrgNodeInline | null;
}

export interface OrgNode {
  id: number;
  name: string;
  code: string;
  kind: OrgNodeKind;
  /** Null for a school-wide unit. */
  branch: BranchInline | null;
  parent: OrgNodeInline | null;
  head_position: PositionInline | null;
  head: StaffHolder | null;
  description: string;
  is_active: boolean;
  children_count: number;
  /** Whether the viewer may change this unit rather than only read it. */
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: number;
  title: string;
  code: string;
  org_node: OrgNodeInline;
  /** The unit's branch; null for a school-wide post. */
  branch: BranchInline | null;
  reports_to: PositionInline | null;
  headcount: number;
  is_active: boolean;
  current_holders: StaffHolder[];
  is_vacant: boolean;
  open_seats: number;
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}

export interface PositionAssignment {
  id: number;
  staff: StaffHolder;
  position: PositionInline;
  is_primary: boolean;
  is_acting: boolean;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  /** The viewer manages both the post and the person. */
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}

/** Who holds which post now, and whether they are acting. No tenure dates. */
export interface CurrentOrganogramAssignment {
  staff: StaffHolder;
  position: PositionInline;
  is_acting: boolean;
}

export interface MatrixReport {
  id: number;
  position: PositionInline;
  reports_to: PositionInline;
  relationship_label: string;
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}

/** One post in the tree, with the posts reporting to it along the solid line. */
export interface OrganogramNode {
  id: number;
  title: string;
  code: string;
  org_node: OrgNodeInline | null;
  branch: BranchInline | null;
  holders: StaffHolder[];
  is_vacant: boolean;
  direct_reports: OrganogramNode[];
}

/**
 * The strip above the chart. Behind `school.teachers.update`, because leave
 * and suspension counts and the size of the establishment are an
 * administrator's business rather than every colleague's, and every teacher
 * holds the directory key.
 */
export interface OrganogramSummary {
  active_staff: number;
  departments: number;
  positions: number;
  total_seats: number;
  filled_seats: number;
  vacant_seats: number;
  acting: number;
  on_leave: number;
  suspended: number;
}

/** A person's place on the chart, carried on their staff record. */
export interface StaffOrganogramPlacement {
  position: PositionInline;
  org_node: OrgNodeInline | null;
  line_manager: StaffHolder | null;
  is_acting: boolean;
}

export interface OrgNodeWritePayload {
  name?: string;
  code?: string;
  kind?: OrgNodeKind;
  /** Null for school-wide. Omitted, a branch-bound administrator's own branch. */
  branch_id?: number | null;
  parent_id?: number | null;
  head_position_id?: number | null;
  description?: string;
  is_active?: boolean;
}

export interface PositionWritePayload {
  title?: string;
  code?: string;
  org_node_id?: number;
  reports_to_id?: number | null;
  headcount?: number;
  is_active?: boolean;
}

export interface AssignmentCreatePayload {
  staff_id: number;
  position_id: number;
  is_primary?: boolean;
  is_acting?: boolean;
  start_date?: string;
}

export interface MatrixReportWritePayload {
  position_id: number;
  reports_to_id: number;
  relationship_label?: string;
}

export interface OrganogramListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}
