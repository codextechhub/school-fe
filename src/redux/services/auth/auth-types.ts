import type { BranchReach, FieldAccessPayload, SchoolInfo, TenantInfo, User } from "@/redux/features/auth/auth-types";

/**
 * An app the signed-in account can open beside the staff app: `parent_app` at
 * `/parent/` for a member of staff who is a parent of a child on the roll.
 */
export interface OtherApp {
  key: string
  path: string
}

export interface ResponseMessage {
    status: boolean;
    message: string;
}

/**
 * Who an invitation or password-reset link is for, shown before the password
 * is set. `email` is null for an account that has none (a pupil who signs in
 * with their admission number); `sign_in_as` is then what they sign in with.
 */
export interface LinkPreview {
  email: string | null
  full_name: string
  sign_in_as?: string
  /** The student app's address for a pupil; null for staff. */
  device_app?: { path: string } | null
  /** The parent app's address for a parent with no staff role; null otherwise. */
  home_app?: { path: string } | null
}

/**
 * `GET /user/auth/password/policy/`: the rules the server enforces on every
 * password it accepts. `requirements` is the same rules as sentences, in the
 * order to show them.
 */
export interface PasswordPolicy {
  min_length: number
  require_uppercase: boolean
  require_lowercase: boolean
  require_digit: boolean
  require_special: boolean
  requirements: string[]
}

export interface LoginResponse extends ResponseMessage {
  data: {
    access: string
    session_id: number
    user: User
    permissions: string[]
    school: SchoolInfo | null
    /**
     * The tenant the session belongs to. Present on every login response; the
     * type omitted it, so the CX-staff guard had nothing to read but the
     * `user_type` column that has since been removed.
     */
    tenant: TenantInfo | null
    /** Which fields this user may not read or change; absent means none. */
    field_access?: FieldAccessPayload
    /** The branches this user may work in. */
    branch_reach?: BranchReach
    /**
     * Set for a pupil: their sign-in belongs in the student app at `path`, and
     * this app writes no session for them (see `handOverToStudentApp`). Null
     * for staff.
     */
    device_app?: { path: string } | null
    /**
     * Set for a parent with no staff role: their sign-in belongs in the parent
     * app at `path`, which keeps its own session, so this app writes none (see
     * `openHomeApp`). Null for staff and for a teacher who is also a parent.
     */
    home_app?: { path: string } | null
    /** The apps this account can open beside this one (see `OtherApp`). */
    other_apps?: OtherApp[]
  }
}
