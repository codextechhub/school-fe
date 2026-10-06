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
  /** Empty means school-wide; otherwise every listed branch is part of this role's reach. */
  branch_ids: number[];
  /**
   * Whether the reader may change what this role means: its name, status,
   * permissions, field access and existence. False for a branch-bound reader
   * on a school-wide role or on one reaching a branch they do not work in.
   * Absent from a server that does not send it, where the reader's reach
   * decides by the same rule.
   */
  can_edit?: boolean;
}

/** One grant on a role, as the detail payload carries it. */
export interface RolePermissionRow {
  permission: string;
  /** The permission's readable wording, for a grant the catalogue does not list. */
  permission_label?: string;
  granted: boolean;
}

/** A restricted permission waiting on approval, and the request carrying it. */
export interface PendingAddition {
  permission_key: string;
  /** The permission's readable wording, for one the catalogue does not list. */
  permission_label?: string;
  request_id: string;
}

/** A role with everything it holds. */
export interface SchoolRoleDetail extends SchoolRole {
  /** A role with any past assignment keeps its audit trail and cannot be deleted. */
  has_assignment_history: boolean;
  /** Whether the reader holds this role, so a screen that changes it knows to
   *  refresh the reader's own access. The server computes it because a person
   *  may hold several roles and the token carries one. */
  held_by_me: boolean;
  /**
   * Restricted permissions asked for on this role and still waiting on the
   * approval ladder. A save never grants a restricted permission the role does
   * not already hold: it grants the rest and raises a request for these.
   */
  pending_additions: PendingAddition[];
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
  band: string | null;
  depth_label: string | null;
  unavailable_reason: string | null;
}

export interface CatalogueField {
  key: string;
  name: string;
  api_names: string[];
  label: string;
  group: string;
  description: string;
  sensitive: boolean;
  writable: boolean;
  default: { read: boolean; write: boolean };
}

export interface CatalogueResource {
  resource: string;
  label: string;
  available: boolean;
  permissions: CataloguePermission[];
  fields: CatalogueField[];
}

/** The catalogue, grouped by module and then resource. */
export interface CatalogueModule {
  module: string;
  label: string;
  /** True when anything in the group is usable by this school. */
  available: boolean;
  resources: CatalogueResource[];
}

export interface RoleFieldAccessEntry extends CatalogueField {
  module: string;
  resource: string;
  read: boolean;
  write: boolean;
  source: "default" | "role";
  set_by_name: string | null;
  set_at: string | null;
}

export interface RoleFieldAccessResponse {
  role: { key: string; name: string; branch_name: string | null };
  fields: RoleFieldAccessEntry[];
}

export type RoleFieldAccessChange =
  | { field: string; reset: true }
  | { field: string; read?: boolean; write?: boolean };

export type FieldAccessMode = "ALLOW" | "DENY";
export type FieldAccessKind = "READ" | "WRITE";

export interface UserFieldAccessOverride {
  id: number;
  user_id: string;
  field: string;
  field_key: string;
  field_label: string;
  access: FieldAccessKind;
  mode: FieldAccessMode;
  reason: string;
  expires_at: string | null;
  is_expired: boolean;
  /** What the roles alone say about the field; null on a past view. */
  role_state: { read: boolean; write: boolean } | null;
  created_by_id: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

/** What creating a role of the school's own needs. */
export interface NewRole {
  /** Optional: the server derives one from the name when it is left out. */
  key?: string;
  name: string;
  description?: string;
  permission_keys?: string[];
  /** Empty means school-wide. The server checks every id belongs to this school. */
  branch_ids: number[];
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
  /** Replaces the role's entire branch reach. Empty means school-wide. */
  branch_ids?: number[];
  /** Required by the server whenever `permission_keys` is sent, and recorded on
   *  the audit entry for the change. Omitting it fails the save with a field
   *  error on `reason`. */
  reason?: string;
}


/** One person holding a role, as the role's People tab lists them. */
export interface RoleHolder {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  /** Null inherits the role's reach, which may cover selected branches. */
  branch: number | null;
  assignment_status: string;
  assigned_at: string;
  assigned_by_name: string | null;
}
