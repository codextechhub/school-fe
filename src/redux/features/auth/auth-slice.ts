import type { RootStateType } from "@/redux/store";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  type ActiveImpersonation,
  type Auth,
  type BranchReach,
  type FieldAccessPayload,
  type AuthContextSnapshot,
  type SchoolInfo,
  type TenantInfo,
  type User,
} from "./auth-types";

// Shape of the login / activation response's `data` envelope.
interface AuthPayload {
  user: User | null;
  session_id?: number;
  permissions?: string[];
  school?: SchoolInfo | null;
  tenant?: TenantInfo | null;
  field_access?: FieldAccessPayload;
  branch_reach?: BranchReach;
}

/**
 * The map of a user with no field restrictions. One frozen instance, so a
 * selector falling back to it hands every render the same reference.
 */
const EMPTY_FIELD_ACCESS: FieldAccessPayload = Object.freeze({});

const initialState: Auth = {
   session_id: 0,
   user: null,
   permissions: [],
   school: null,
   tenant: null,
   impersonation: null,
   field_access: EMPTY_FIELD_ACCESS,
   branch_reach: null,
};

/**
 * `/me` re-runs on mount, on token refresh and (since focus-refetch) every time
 * the user tabs back - but the context it returns is almost always identical to
 * what is already in the store. Assigning unconditionally would hand every
 * `selectPermissions` / `selectTenant` consumer a brand-new reference on each of
 * those runs, re-rendering the whole protected tree for nothing. Compare first
 * and no-op when nothing actually changed; Immer then
 * returns the very same state object.
 */
const samePermissions = (a: string[] | undefined, b: string[]): boolean =>
  !!a && a.length === b.length && a.every((perm, i) => perm === b[i]);

/** Order-sensitive, like `samePermissions`: the backend sends a stable order. */
const sameNames = (a: string[] | undefined, b: string[] | undefined): boolean => {
  const left = a ?? [];
  const right = b ?? [];
  return left.length === right.length && left.every((name, i) => name === right[i]);
};

/**
 * Whether two Field Access maps say the same thing.
 *
 * `/me` answers with a new object on every run, so without this every focus
 * would hand `useFieldAccess` a new map and rebuild every memoised field check
 * in the app. A missing stored map (a session persisted before the field
 * existed) never equals an incoming one, so the first `/me` always writes it.
 */
const sameFieldAccess = (
  a: FieldAccessPayload | undefined,
  b: FieldAccessPayload,
): boolean => {
  if (a === b) return true;
  if (!a) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    const left = a[key];
    const right = b[key];
    if (!left || !right) return left === right;
    return (
      sameNames(left.hidden, right.hidden) &&
      sameNames(left.read_only, right.read_only) &&
      sameNames(left.open_on_create, right.open_on_create)
    );
  });
};

/** Whether two branch reaches name the same branches; the backend sorts the ids. */
const sameBranchReach = (
  a: BranchReach | null | undefined,
  b: BranchReach | null,
): boolean =>
  (a ?? null) === b ||
  (!!a &&
    !!b &&
    a.whole_tenant === b.whole_tenant &&
    a.branch_ids.length === b.branch_ids.length &&
    a.branch_ids.every((id, i) => id === b.branch_ids[i]));

/**
 * Every field the app reads off the tenant belongs in this comparison. It used
 * to test slug and name only, which was harmless while those were the only
 * fields that existed - and stopped being harmless the moment `status` started
 * deciding what a school may open: a /me sync carrying the school's move from
 * PENDING to ACTIVE would have been dropped here as "the same tenant", leaving
 * the app locked against a school the server had already let in.
 */
const sameTenant = (
  a: TenantInfo | null | undefined,
  b: TenantInfo | null
): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.slug === b.slug &&
    a.name === b.name &&
    a.kind === b.kind &&
    a.status === b.status);

const sameSchool = (
  a: SchoolInfo | null | undefined,
  b: SchoolInfo | null
): boolean =>
  a === b ||
  (!!a && !!b && a.id === b.id && a.name === b.name && a.slug === b.slug && a.logo === b.logo);

/**
 * Identity comparison for the same no-op reason as the guards above: `/me`
 * re-runs on mount, refresh and focus, and its `user` payload is a brand-new
 * object every time. `updated_at` moves whenever anything about the record
 * changes, so id + updated_at + the fields the shell renders is enough to know
 * the identity is unchanged without deep-comparing an object whose fields vary with Field Access.
 */
const sameUser = (a: User | null | undefined, b: User | null): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.id === b.id &&
    a.updated_at === b.updated_at &&
    a.full_name === b.full_name &&
    a.email === b.email &&
    a.role === b.role &&
    a.branch_name === b.branch_name);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: () => initialState,
    setAuthUser: (state, action: PayloadAction<AuthPayload>) => {
      state.user = action.payload.user;
      state.session_id = action.payload.session_id || 0;
      state.permissions = action.payload.permissions ?? [];
      state.school = action.payload.school ?? null;
      state.tenant = action.payload.tenant ?? null;
      state.field_access = action.payload.field_access ?? EMPTY_FIELD_ACCESS;
      state.branch_reach = action.payload.branch_reach ?? null;
    },
    updateAuthUser: (state, action: PayloadAction<Partial<User>>) => {
      state.user = { ...(state.user as User), ...action.payload };
    },
    setSessionId: (state, action: PayloadAction<number>) => {
      state.session_id = action.payload;
    },
    /** Refreshes what the user may do, keeping the two halves in step. */
    updatePermissions: (
      state,
      action: PayloadAction<{
        permissions: string[];
        field_access?: FieldAccessPayload;
        branch_reach?: BranchReach | null;
      }>,
    ) => {
      const { permissions } = action.payload;
      const fieldAccess = action.payload.field_access ?? EMPTY_FIELD_ACCESS;
      if (!samePermissions(state.permissions, permissions)) state.permissions = permissions;
      if (!sameFieldAccess(state.field_access, fieldAccess)) state.field_access = fieldAccess;
      const reach = action.payload.branch_reach;
      if (reach !== undefined && !sameBranchReach(state.branch_reach, reach)) {
        state.branch_reach = reach;
      }
    },
    /**
     * Refresh the cached school identity.
     *
     * The sidebar and the favicon render `school.logo` from the session, which
     * is written at login and refreshed by `/me`. A school that uploads its own
     * logo would otherwise keep seeing the old one - or the bundled default -
     * until its next sync, on the one screen where it just changed it.
     */
    updateSchool: (state, action: PayloadAction<SchoolInfo | null>) => {
      if (sameSchool(state.school, action.payload)) return;
      state.school = action.payload;
    },
    updateTenant: (state, action: PayloadAction<TenantInfo | null>) => {
      if (sameTenant(state.tenant, action.payload)) return;
      state.tenant = action.payload;
    },
    /**
     * Apply a complete effective identity in one dispatch.
     *
     * This is what `/me` hydrates and what a proxy start/exit swaps: the whole
     * context moves together, so applying it field-by-field would briefly leave
     * the shell rendering one user's name beside another user's permissions.
     * Every field keeps its own no-op guard, so the common case (`/me` returning
     * an unchanged context on focus) still touches nothing.
     */
    setAuthContext: (state, action: PayloadAction<AuthContextSnapshot>) => {
      if (!sameUser(state.user, action.payload.user)) state.user = action.payload.user;
      if (!sameSchool(state.school, action.payload.school)) state.school = action.payload.school;
      if (!sameTenant(state.tenant, action.payload.tenant)) state.tenant = action.payload.tenant;
      if (!samePermissions(state.permissions, action.payload.permissions)) {
        state.permissions = action.payload.permissions;
      }
      // An actor snapshot persisted before the map existed carries none.
      const fieldAccess = action.payload.field_access ?? EMPTY_FIELD_ACCESS;
      if (!sameFieldAccess(state.field_access, fieldAccess)) {
        state.field_access = fieldAccess;
      }
      // An actor snapshot persisted before reach existed carries none either.
      const reach = action.payload.branch_reach ?? null;
      if (!sameBranchReach(state.branch_reach, reach)) state.branch_reach = reach;
    },
    setImpersonation: (state, action: PayloadAction<ActiveImpersonation | null>) => {
      state.impersonation = action.payload;
    },
  },
});

export const {
  setAuthUser,
  setSessionId,
  updateAuthUser,
  updatePermissions,
  updateSchool,
  updateTenant,
  setAuthContext,
  setImpersonation,
} = authSlice.actions;
export const resetAuth = authSlice.actions.reset;

export const authSliceReducer = authSlice.reducer;

export const selectUser = (state: RootStateType) => state.auth.user;
// Shared empty array: a `?? []` literal would mint a new reference on every
// call, so a legacy persisted session with no `permissions` key would re-render
// its consumers on every dispatched action regardless of the reducer guard.
const NO_PERMISSIONS: string[] = [];
/** Whether this session is on the platform tenant rather than a school's.

The shared workflow screens ask, because a platform reader may point a step at
things a school never can. In a school app the answer is always false, and it
is answered honestly from the session rather than hard-coded, so an impersonated
CodeX session reads correctly too. */
export const selectIsPlatformTenant = (state: RootStateType) =>
  state.auth.tenant?.kind === "PLATFORM";

export const selectPermissions = (state: RootStateType) =>
  state.auth.permissions ?? NO_PERMISSIONS;
/**
 * The effective user's Field Access map, as received. Falls back to the one
 * shared empty map, so a reader never sees a new object for "no restrictions".
 * The shape satisfies the finance package's `FieldAccessMap`, and stays the
 * mutable one so an identity snapshot can carry it unchanged.
 */
export const selectFieldAccess = (state: RootStateType): FieldAccessPayload =>
  state.auth.field_access ?? EMPTY_FIELD_ACCESS;
export const selectBranchReach = (state: RootStateType): BranchReach | null =>
  state.auth.branch_reach ?? null;
export const selectSchool = (state: RootStateType) => state.auth.school ?? null;
export const selectTenant = (state: RootStateType) => state.auth.tenant ?? null;
/**
 * True when this school has not gone live.
 *
 * Read from the tenant the session was issued with, so it costs no request and
 * is known before the first screen paints. An ABSENT status reads as live on
 * purpose: a session persisted before the backend started sending the field
 * must not lock a working school out of its own app, and a pending school that
 * slips through is still refused by the server.
 */
export const selectTenantIsPending = (state: RootStateType) =>
  state.auth.tenant?.status === "PENDING";
export const selectImpersonation = (state: RootStateType) =>
  state.auth.impersonation ?? null;
// While proxying, `permissions` holds the TARGET's grants - so a "can I proxy?"
// check must read the retained actor snapshot, otherwise the exit affordance
// disappears the moment the proxy starts (stranding the admin as the target).
export const selectActorPermissions = (state: RootStateType) =>
  state.auth.impersonation?.actor.permissions ?? selectPermissions(state);
