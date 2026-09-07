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
 * A request to change what a role reaches, waiting on a decision.
 *
 * Restricted permissions cannot be granted by editing a role directly: the
 * server refuses and asks for one of these instead. So this is not an optional
 * workflow a school can ignore - it is the only route to every permission that
 * actually spends or bills money.
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
}

/** A decision on one request. Denial requires a reason; approval does not. */
export interface RoleChangeDecision {
  id: number;
  action: "APPROVE" | "DENY";
  notes?: string;
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
