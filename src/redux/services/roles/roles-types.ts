/** One of the school's roles, as the roles table renders it. */
export interface SchoolRole {
  id: number;
  key: string;
  name: string;
  status: string;
  /**
   * True for the baseline CodeX seeded. These are the "default role templates"
   * the design asks a school to confirm; everything else is a role the school
   * added itself.
   */
  is_system_role: boolean;
  /** A locked role's permissions are CodeX's to change, not the school's. */
  is_locked: boolean;
  assigned_users_count: number;
  permissions_count: number;
  branch: number | null;
}

/** One grant on a role, as the detail payload carries it. */
export interface RolePermissionRow {
  permission: string;
  granted: boolean;
}

/** A role with everything it holds. */
export interface SchoolRoleDetail extends SchoolRole {
  /** Whether the reader holds this role. A restricted addition to your own role
   *  goes through approval; to anybody else's it saves, so the button has to
   *  know before anything is pressed. The server computes it because a person
   *  may hold several roles and the token carries one. */
  held_by_me: boolean;
  description: string;
  role_permissions: RolePermissionRow[];
}

/** One permission a role could be given. */
export interface CataloguePermission {
  key: string;
  /** The sentence beside the checkbox; never a raw key. */
  label: string;
  resource: string;
  action: string;
  sensitivity: string;
  /** Flows through an approval rather than taking effect on save. */
  is_restricted: boolean;
  /**
   * The product this permission belongs to, or null when it is core to every
   * school. Set from the server's capability map, not guessed from the key.
   */
  capability: string | null;
  /**
   * Whether this school can use it today. False means the module is not on
   * their plan: the box is shown but cannot be ticked, so a school can see what
   * switching the module on would give them.
   */
  available: boolean;
}

/** The catalogue, grouped the way the drawer groups it. */
export interface CatalogueModule {
  module: string;
  /** True when anything in the group is usable by this school. */
  available: boolean;
  permissions: CataloguePermission[];
}

/** What creating a role of the school's own needs. */
export interface NewRole {
  /** Optional: the server derives one from the name when it is left out. */
  key?: string;
  name: string;
  description?: string;
  permission_keys?: string[];
  /** Required by the server whenever `permission_keys` is sent, empty list
   *  included, and recorded on the audit entry for the change. */
  reason?: string;
}

/** A change to an existing role. Everything named is replaced. */
export interface RoleUpdate {
  key: string;
  name?: string;
  description?: string;
  /** A REPLACEMENT list, not an addition. */
  permission_keys?: string[];
  /** Required by the server whenever `permission_keys` is sent, and recorded on
   *  the audit entry for the change. Omitting it fails the save with a field
   *  error on `reason`. */
  reason?: string;
}


/** One permission a request wants added or taken away. */
export interface RoleChangeDeltaItem {
  id: number;
  operation: "ADD" | "REMOVE";
  permission: {
    key: string;
    description: string;
    sensitivity_level: string;
    is_restricted: boolean;
  };
}

/**
 * Where a request has got to in its approval ladder.
 *
 * `status` on the request says PENDING or APPROVED; this says who it is waiting
 * on. A screen that can only show "waiting" cannot tell the reader whether they
 * are the person being waited for, and at a school with two administrators that
 * is the entire question.
 *
 * Null for a request raised before role changes were routed through the
 * approval engine. Those have no ladder to act on and cannot be decided.
 */
export interface RoleChangeApproval {
  instance_id: string;
  /** The engine's own status: IN_PROGRESS, APPROVED, REJECTED, and so on. */
  status: string;
  /** The stage the ladder is waiting on, empty once it is finished. */
  stage_label: string;
  /**
   * Whether the reader is on this stage's approver list.
   *
   * Read from the frozen snapshot the server will check when the button is
   * pressed, so a button that shows is a button that works.
   */
  can_act: boolean;
  /** Whether the reader is the person who raised it. */
  self_raised: boolean;
}

/**
 * A request to change what a role reaches, waiting on a decision.
 *
 * Restricted permissions cannot be granted by editing a role directly: the
 * server refuses and asks for one of these instead. So this is not an optional
 * workflow a school can ignore - it is the only route to every permission that
 * actually spends or bills money.
 *
 * Each one runs an approval ladder from the moment it is raised. The statuses
 * here summarise it and `approval` carries the detail.
 */
export interface RoleChangeRequest {
  id: number;
  target_role: number;
  status: "PENDING" | "APPROVED" | "DENIED" | "APPLY_FAILED";
  justification: string;
  requested_by: number | null;
  reviewer: number | null;
  reviewer_notes: string;
  submitted_at: string;
  decided_at: string | null;
  delta_items: RoleChangeDeltaItem[];
  approval: RoleChangeApproval | null;
}

/** What raising a request needs. */
export interface NewRoleChangeRequest {
  target_role: number;
  justification: string;
  delta_items: { permission_key: string; operation: "ADD" | "REMOVE" }[];
}


/** One person holding a role, as the drawer's People tab lists them. */
export interface RoleHolder {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  /** Null when the role is held school-wide rather than at one branch. */
  branch: number | null;
  assignment_status: string;
  assigned_at: string;
  assigned_by_name: string | null;
}
