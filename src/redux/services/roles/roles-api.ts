import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import { getTenantSlug } from "@/utils/tenant-context";
import type {
  CatalogueModule,
  NewRole,
  NewRoleChangeRequest,
  RoleHolder,
  RoleChangeDecision,
  RoleChangeRequest,
  RoleUpdate,
  SchoolRole,
  SchoolRoleDetail,
} from "./roles-types";

/**
 * The school's own roles, at /v1/rbac/tenants/<slug>/…
 *
 * Unlike the profile and staff surfaces, these endpoints DO carry the school in
 * the path. That is the platform's existing shape, not a choice made here, and
 * it is not a hole: the view refuses any slug that is not the one the session
 * asserts, with a 404 rather than a 403 so slugs cannot be probed. The slug is
 * read from the same store the base query reads it from, so the path and the
 * ?tenant= assertion can never disagree.
 *
 * All of it is open to a school that has not gone live except DELETE, which
 * stays closed - onboarding asks a school to confirm and extend the baseline,
 * not to dismantle it.
 */
const scope = () => `/rbac/tenants/${getTenantSlug()}`;

export const rolesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSchoolRoles: builder.query<PaginatedEnvelope<SchoolRole>, void>({
      query: () => ({ url: `${scope()}/roles/`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: ["Roles"],
    }),

    /** One role, with every permission it holds. Backs the preview drawer. */
    getSchoolRole: builder.query<Envelope<SchoolRoleDetail>, string>({
      query: (key) => ({ url: `${scope()}/roles/${key}/`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: (_result, _error, key) => [{ type: "Roles", id: key }],
    }),

    /**
     * Everything this school is allowed to grant, grouped by module.
     *
     * Not the global registry: that one is CodeX's and carries keys no school
     * may ever hold. This is the short list, filtered by the same scope column
     * the save is checked against, so the drawer cannot offer a box that
     * ticking would fail.
     */
    getPermissionCatalogue: builder.query<Envelope<CatalogueModule[]>, void>({
      query: () => ({ url: `${scope()}/permission-catalogue/`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: ["PermissionCatalogue"],
    }),

    createSchoolRole: builder.mutation<Envelope<SchoolRoleDetail>, NewRole>({
      query: (body) => ({ url: `${scope()}/roles/`, method: "POST", body }),
      extraOptions: { silent: true },
      // The onboarding gate reads the role baseline to decide whether the
      // roles step can close, so a role added here can change the checklist.
      invalidatesTags: ["Roles", "Onboarding"],
    }),

    /**
     * Change a role: its name, what it is for, and what it reaches.
     *
     * `permission_keys` is a REPLACEMENT, not an addition: the server drops
     * every grant the list does not name. The drawer therefore has to send the
     * full ticked set, never a delta.
     */
    /**
     * Take a role out of use, or bring it back.
     *
     * Not a delete. A role somebody holds is somebody's access, and archiving
     * it keeps the record of who held what; INACTIVE stops it granting anything
     * while leaving the assignments readable. Deleting is a separate act the
     * onboarding surface deliberately does not offer at all.
     */
    setSchoolRoleStatus: builder.mutation<
      Envelope<SchoolRoleDetail>,
      { key: string; status: "ACTIVE" | "INACTIVE"; reason: string }
    >({
      query: ({ key, ...body }) => ({
        url: `${scope()}/roles/${key}/`,
        method: "PATCH",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, { key }) => [
        "Roles",
        { type: "Roles", id: key },
      ],
    }),

    updateSchoolRole: builder.mutation<Envelope<SchoolRoleDetail>, RoleUpdate>({
      query: ({ key, ...body }) => ({
        url: `${scope()}/roles/${key}/`,
        method: "PATCH",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_result, _error, { key }) => [
        "Roles",
        { type: "Roles", id: key },
        "Onboarding",
      ],
    }),

    /**
     * The people holding one role.
     *
     * Answers the question the roles table raises and could not settle: it
     * reports "4 people" and, until this, there was no way to find out which
     * four. Filtered server-side by role key rather than fetched whole and
     * filtered here, because a school's assignment list grows with its staff
     * and this drawer wants one role's worth.
     */
    getRoleHolders: builder.query<
      PaginatedEnvelope<RoleHolder>,
      { role: string }
    >({
      query: ({ role }) => ({
        url: `${scope()}/role-assignments/`,
        method: "GET",
        params: { role, assignment_status: "ACTIVE" },
      }),
      extraOptions: { silent: true },
      providesTags: (_r, _e, { role }) => [{ type: "Roles", id: `holders-${role}` }],
    }),

    /**
     * Give one person a role, at one branch or across the school.
     *
     * **`user` is the ACCOUNT's id, not the staff record's.** They are two
     * different numbers on the same person, and sending the wrong one either
     * refuses with "no such user" or, worse, lands on somebody else. Staff rows
     * carry `user_id` for exactly this.
     *
     * `branch` null is a whole-school grant, which is a choice a school makes
     * rather than a field it forgot: it reaches every branch, including ones
     * opened later. A branch id pins it, and the same role may be pinned at two
     * branches for one person - the schema was split in two to allow that, and
     * both write paths were fixed to stop refusing it.
     */
    assignRole: builder.mutation<
      Envelope<RoleHolder>,
      { user: number; role: number; branch?: number | null }
    >({
      query: (body) => ({
        url: `${scope()}/role-assignments/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      // The staff list carries a Role column and the profile carries the reach,
      // so both move when a grant does.
      invalidatesTags: ["Roles", "SchoolStaff"],
    }),

    /**
     * Withdraw a grant, with a reason the audit trail keeps.
     *
     * The row is not deleted: "what could this person do before" is the
     * question asked after something has gone wrong, and a deleted grant cannot
     * answer it. The server requires the note, so the form does too.
     */
    revokeRoleAssignment: builder.mutation<
      Envelope<RoleHolder>,
      { id: number; reason_note: string }
    >({
      query: ({ id, reason_note }) => ({
        url: `${scope()}/role-assignments/${id}/revoke/`,
        method: "POST",
        body: { reason_note },
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Roles", "SchoolStaff"],
    }),

    /**
     * Requests to change what a role reaches, newest first.
     *
     * Not an optional workflow. Every permission that bills a family or moves
     * money is marked restricted, and the server refuses to grant one by
     * editing a role: it asks for a request instead. A school with no screen for
     * these can create roles and can never give them the powers they exist for.
     */
    getRoleChangeRequests: builder.query<
      PaginatedEnvelope<RoleChangeRequest>,
      { status?: string } | void
    >({
      query: (params) => ({
        url: `${scope()}/role-change-requests/`,
        method: "GET",
        params: params && "status" in params && params.status
          ? { status: params.status }
          : undefined,
      }),
      extraOptions: { silent: true },
      providesTags: ["RoleChangeRequests"],
    }),

    createRoleChangeRequest: builder.mutation<
      Envelope<RoleChangeRequest>,
      NewRoleChangeRequest
    >({
      query: (body) => ({
        url: `${scope()}/role-change-requests/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["RoleChangeRequests"],
    }),

    /**
     * Approve or deny one request.
     *
     * Approving rewrites the target role in the same transaction, so Roles is
     * invalidated too: the roles table's permission counts are wrong the moment
     * this returns, and a stale count on a permissions screen is worse than a
     * spinner.
     */
    decideRoleChangeRequest: builder.mutation<
      Envelope<RoleChangeRequest>,
      RoleChangeDecision
    >({
      query: ({ id, ...body }) => ({
        url: `${scope()}/role-change-requests/${id}/decide/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["RoleChangeRequests", "Roles"],
    }),
  }),
});

export const {
  useGetSchoolRolesQuery,
  useGetSchoolRoleQuery,
  useGetPermissionCatalogueQuery,
  useCreateSchoolRoleMutation,
  useUpdateSchoolRoleMutation,
  useSetSchoolRoleStatusMutation,
  useGetRoleHoldersQuery,
  useAssignRoleMutation,
  useRevokeRoleAssignmentMutation,
  useGetRoleChangeRequestsQuery,
  useCreateRoleChangeRequestMutation,
  useDecideRoleChangeRequestMutation,
} = rolesApi;
