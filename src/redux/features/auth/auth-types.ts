/**
 * The `field_access` map as the login response and `/user/auth/me/` send it.
 *
 * Stored in this mutable shape because the store's reducers cannot hold the
 * read-only arrays of the finance package's `FieldAccessMap`. Every reader
 * gets it back as a `FieldAccessMap`, which this shape satisfies.
 */
export type FieldAccessPayload = Record<string, {
  hidden?: string[]
  read_only?: string[]
  open_on_create?: string[]
}>

export interface Auth {
  session_id?: number
  user?: User | null
  permissions?: string[]
  /**
   * Which fields the effective user may not read or change, keyed by
   * `module.resource`, exactly as the login response and `/user/auth/me/`
   * send it. An absent resource or name means full access, so `{}` is a user
   * with no restrictions. It always describes the same person as
   * `permissions`: the proxied target while proxying, the actor otherwise.
   */
  field_access?: FieldAccessPayload
  school?: SchoolInfo | null
  tenant?: TenantInfo | null
  /** Set only while this admin is proxying another user in their own school. */
  impersonation?: ActiveImpersonation | null
}

/**
 * An active proxy ("impersonation") session.
 *
 * `id` is echoed on every proxied request as `X-Impersonation-Session`. The
 * actor snapshot is the ORIGINAL signed-in context, retained verbatim so
 * exiting the proxy - or recovering from a collapsed session - can restore the
 * real user instantly, without waiting on a network round-trip.
 */
export interface ActiveImpersonation {
  id: number
  /** Always the actor's own school tenant: school proxying is intra-tenant. */
  tenantSlug: string
  target: ProxyTargetIdentity
  actor: AuthContextSnapshot
}

/** Minimal identity of a proxy target, as returned by the targets search. */
export interface ProxyTargetIdentity {
  id: number
  email: string
  full_name: string
  tenant_kind: string
  role: string
  tenant_slug: string
  tenant_name: string
  school_name: string | null
}

/** The pieces of state that together define "who the app thinks I am". */
export interface AuthContextSnapshot {
  user: User | null
  school: SchoolInfo | null
  tenant: TenantInfo | null
  permissions: string[]
  /** Required, so a writer can never swap identities and keep the old map. */
  field_access: FieldAccessPayload
}

// The caller's asserted tenant, from the login / me payload. Every tenant-owned
// request carries ?tenant=<slug>; the slug must match this.
export interface TenantInfo {
  slug: string
  name: string
  /**
   * PLATFORM or SCHOOL: which side of the platform boundary this tenant is.
   *
   * The only thing left that separates a Codex staff account from a school
   * account, now that the `user_type` persona is gone from the API, and the
   * more reliable of the two: a tenant cannot be wrong about itself.
   */
  kind: string
  /**
   * PENDING, ACTIVE, INACTIVE or SUSPENDED.
   *
   * PENDING means the school has not gone live: the backend refuses it every
   * surface but onboarding, and until this field existed the app could only
   * find that out by being refused - so a screen that makes no request looked
   * open, and a school still being set up could wander into a page it will
   * never be allowed to use. Optional because a session persisted before the
   * field shipped has no value for it; treat an absent status as live rather
   * than locking a real school out of its own app.
   */
  status?: string
}

export interface User {
  id: number
  uid: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  gender: string
  role: string
  status: string
  school_id: number | null
  school_name: string | null
  branch_id: number | null
  branch_name: string | null
  created_at: string
  updated_at: string
  // Field Access fields (`platform.team`): absent from the payload when the
  // viewer may not read them, so consumers must guard rather than assume presence.
  password_changed_at?: string | null
  last_login_at?: string
  invited_by_id?: number | null
  invited_by_name?: string | null
}

// Nested school-identity object the backend attaches to the login / me / activation
// payloads for school users. `null` for CX_STAFF (or any user without a school FK);
// `logo` is `null` when no branding logo has been uploaded.
export interface SchoolInfo {
  id: number
  name: string
  slug: string
  logo: string | null
}
