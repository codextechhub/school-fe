import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { baseApi } from "../base-api";
import type { Envelope, PaginatedEnvelope } from "../onboarding/onboarding-types";
import { getTenantSlug } from "@/utils/tenant-context";
import { fetchAllPages } from "@/utils/fetch-all-pages";
import type {
  CatalogueModule,
  FieldAccessKind,
  FieldAccessMode,
  NewRole,
  NewRoleChangeRequest,
  RoleHolder,
  RoleChangeRequest,
  RoleUpdate,
  RoleFieldAccessChange,
  RoleFieldAccessResponse,
  SchoolRole,
  SchoolRoleDetail,
  UserFieldAccessOverride,
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

    /**
     * Every role the school holds, for pickers that must offer all of them.
     *
     * The roles list is paginated with at most 100 rows a page and has no
     * search, so a single request silently drops later roles once a school
     * outgrows one page. This walks every page at the largest size instead,
     * while callers that need pagination can use the single-page query above.
     */
    getFieldAccessRoles: builder.query<SchoolRole[], void>({
      queryFn: (_arg, _api, _extra, baseQuery) =>
        fetchAllPages<SchoolRole, FetchBaseQueryError>(async (page) => {
          const { data, error } = await baseQuery({
            url: `${scope()}/roles/`,
            method: "GET",
            params: { page, page_size: 100 },
          });
          return error ? { error } : { data: data as PaginatedEnvelope<SchoolRole> };
        }),
      extraOptions: { silent: true },
      providesTags: ["Roles"],
    }),

    /** One role, with every permission and branch it holds. */
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
     * the save is checked against, so the editor cannot offer a box that
     * ticking would fail.
     */
    getAccessCatalogue: builder.query<
      Envelope<CatalogueModule[]>,
      { module?: string; resource?: string; search?: string } | void
    >({
      query: (params) => ({
        url: `${scope()}/access-catalogue/`,
        method: "GET",
        params: params || undefined,
      }),
      extraOptions: { silent: true },
      providesTags: ["PermissionCatalogue"],
    }),

    getRoleFieldAccess: builder.query<
      Envelope<RoleFieldAccessResponse>,
      { key: string; module?: string; resource?: string; search?: string; state?: "hidden" | "read_only" | "full" }
    >({
      query: ({ key, ...params }) => ({
        url: `${scope()}/roles/${encodeURIComponent(key)}/field-access/`,
        method: "GET",
        params,
      }),
      extraOptions: { silent: true },
      providesTags: (_result, _error, { key }) => [{ type: "RoleFieldAccess", id: key }],
    }),

    updateRoleFieldAccess: builder.mutation<
      Envelope<RoleFieldAccessResponse>,
      { key: string; changes: RoleFieldAccessChange[] }
    >({
      query: ({ key, changes }) => ({
        url: `${scope()}/roles/${encodeURIComponent(key)}/field-access/`,
        method: "PATCH",
        body: { changes },
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_result, _error, { key }) => [{ type: "RoleFieldAccess", id: key }],
    }),

    getUserFieldAccessOverrides: builder.query<
      PaginatedEnvelope<UserFieldAccessOverride>,
      { userId: number; access?: FieldAccessKind; mode?: FieldAccessMode; asAt?: string }
    >({
      query: ({ userId, asAt, ...params }) => ({
        url: `${scope()}/users/${userId}/field-access-overrides/`,
        method: "GET",
        params: asAt ? { ...params, as_at: asAt } : params,
      }),
      extraOptions: { silent: true },
      providesTags: (_result, _error, { userId }) => [{ type: "UserFieldAccessOverrides", id: userId }],
    }),

    createUserFieldAccessOverride: builder.mutation<
      Envelope<UserFieldAccessOverride>,
      { userId: number; field: string; access: FieldAccessKind; mode: FieldAccessMode; reason: string; expires_at: string | null }
    >({
      query: ({ userId, ...body }) => ({
        url: `${scope()}/users/${userId}/field-access-overrides/`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_result, _error, { userId }) => [{ type: "UserFieldAccessOverrides", id: userId }],
    }),

    deleteUserFieldAccessOverride: builder.mutation<
      { success: boolean; message: string },
      { userId: number; id: number }
    >({
      query: ({ userId, id }) => ({
        url: `${scope()}/users/${userId}/field-access-overrides/${id}/`,
        method: "DELETE",
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_result, _error, { userId }) => [{ type: "UserFieldAccessOverrides", id: userId }],
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

    deleteSchoolRole: builder.mutation<void, string>({
      query: (key) => ({
        url: `${scope()}/roles/${encodeURIComponent(key)}/`,
        method: "DELETE",
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["Roles", "Onboarding"],
    }),

    /**
     * The people holding one role on a single API page.
     *
     * Answers the question the roles table raises and could not settle: it
     * reports "4 people" and, until this, there was no way to find out which
     * four. Filtered server-side by role key rather than fetched whole and
     * filtered here, because a school's assignment list grows with its staff.
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

    getAllRoleHolders: builder.query<RoleHolder[], { role: string }>({
      queryFn: ({ role }, _api, _extra, baseQuery) =>
        fetchAllPages<RoleHolder, FetchBaseQueryError>(async (page) => {
          const { data, error } = await baseQuery({
            url: `${scope()}/role-assignments/`,
            method: "GET",
            params: { role, assignment_status: "ACTIVE", page, page_size: 100 },
          });
          return error ? { error } : { data: data as PaginatedEnvelope<RoleHolder> };
        }),
      extraOptions: { silent: true },
      providesTags: (_r, _e, { role }) => [{ type: "Roles", id: `holders-${role}` }],
    }),

    /**
     * Give one person a role with the role's configured branch reach.
     *
     * **`user` is the ACCOUNT's id, not the staff record's.** They are two
     * different numbers on the same person, and sending the wrong one either
     * refuses with "no such user" or, worse, lands on somebody else. Staff rows
     * carry `user_id` for exactly this.
     *
     * `branch` null inherits the role's reach. That is school-wide when the
     * role has no selected branches, or exactly its selected branches when it
     * does. A branch id pins a legacy single-branch grant.
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
     * Raise a request to change what a role reaches.
     *
     * Not an optional workflow. Every permission that bills a family or moves
     * money is marked restricted, and the server refuses to grant one by
     * editing a role: it asks for a request instead. Raising one starts an
     * approval ladder, and the request is then read and decided in the workflow
     * approvals inbox alongside every other document awaiting a decision -
     * which is why this app raises them and never lists them.
     */
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
    }),

  }),
});

export const {
  useGetSchoolRolesQuery,
  useGetFieldAccessRolesQuery,
  useGetSchoolRoleQuery,
  useGetAccessCatalogueQuery,
  useGetRoleFieldAccessQuery,
  useUpdateRoleFieldAccessMutation,
  useGetUserFieldAccessOverridesQuery,
  useCreateUserFieldAccessOverrideMutation,
  useDeleteUserFieldAccessOverrideMutation,
  useCreateSchoolRoleMutation,
  useUpdateSchoolRoleMutation,
  useDeleteSchoolRoleMutation,
  useSetSchoolRoleStatusMutation,
  useGetRoleHoldersQuery,
  useGetAllRoleHoldersQuery,
  useAssignRoleMutation,
  useRevokeRoleAssignmentMutation,
  useCreateRoleChangeRequestMutation,
} = rolesApi;
