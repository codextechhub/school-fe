import { generateQueryString } from "@/utils/helpers";
import { baseApi } from "../base-api";
import type {
  ApprovalDelegation,
  ApprovalDelegationsResponse,
  ApproverGroup,
  ApproverGroupMemberPayload,
  ApproverGroupResolution,
  ApproverGroupsResponse,
  ApproverGroupWritePayload,
  ApproverPreviewPayload,
  StageApproverOverride,
  StageApproverOverridePayload,
  StageApproverOverridesResponse,
  ApproverPreviewResult,
  DelegationWritePayload,
  DynamicRole,
  DynamicRoleFields,
  DynamicRolePreviewPayload,
  DynamicRolePreviewResult,
  WorkflowNotificationSetting,
  DynamicRolesResponse,
  DynamicRoleWritePayload,
  PendingApprovalsResponse,
  PublishTemplatePayload,
  TemplateAdoption,
  TemplateComparison,
  TeamLoadRow,
  VoteAction,
  WorkflowInstance,
  WorkflowInstanceDetail,
  WorkflowInstancesResponse,
  WorkflowTemplate,
  WorkflowTemplatesResponse,
} from "./workflow-types";

type QueryParams = Record<string, string | number>;

/**
 * A workflow vote/withdraw/cancel/reverse changes the state of the *business
 * document* underneath (a requisition, PO or vendor invoice), so those consoles'
 * list / summary / detail caches must drop alongside the workflow caches -
 * otherwise a status only refreshes after a manual refetch. RTK only refetches
 * mounted queries, so the cross-domain tags are effectively free off-screen.
 */
const PROC_DOC_TAGS = [
  "ProcRequisitions", "ProcPurchaseOrders", "ProcVendorInvoices", "ProcVendorPayments",
] as const;

export const workflowApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Templates ───────────────────────────────────────────────────────────
    getWorkflowTemplates: builder.query<WorkflowTemplatesResponse, QueryParams>({
      query: (params) => ({ url: `/workflow/templates/${generateQueryString(params)}`, method: "GET" }),
      providesTags: ["WorkflowTemplates"],
    }),

    getWorkflowTemplate: builder.query<WorkflowTemplate, string>({
      query: (id) => ({ url: `/workflow/templates/${id}/`, method: "GET" }),
      providesTags: ["WorkflowTemplates"],
    }),

    publishWorkflowTemplate: builder.mutation<WorkflowTemplate, PublishTemplatePayload>({
      query: (body) => ({ url: `/workflow/templates/publish/`, method: "POST", body }),
      invalidatesTags: ["WorkflowTemplates"],
    }),

    /**
     * Who runs a shared template as published, and who runs their own.
     *
     * Platform actors only, and refused on anything but a shared template - the
     * one place the console reads across tenant boundaries, so it owns its
     * refusals rather than letting the global toast speak for it.
     */
    getTemplateAdoption: builder.query<TemplateAdoption, string>({
      query: (id) => ({ url: `/workflow/templates/${id}/adoption/`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: ["WorkflowTemplates"],
    }),

    /** How one tenant's version of a shared template differs from it. */
    compareTemplate: builder.query<TemplateComparison, { id: string; withId: string }>({
      query: ({ id, withId }) => ({
        url: `/workflow/templates/${id}/compare/${generateQueryString({ with: withId })}`,
        method: "GET",
      }),
      extraOptions: { silent: true },
      providesTags: ["WorkflowTemplates"],
    }),

    // ── Approver groups ─────────────────────────────────────────────────────
    getApproverGroups: builder.query<ApproverGroupsResponse, QueryParams | void>({
      query: (params) => ({
        url: `/workflow/approver-groups/${params ? generateQueryString(params) : ""}`,
        method: "GET",
      }),
      providesTags: [{ type: "WorkflowApproverGroups", id: "LIST" }],
    }),

    /**
     * Who the selected group reaches right now, member by member.
     *
     * Runs the engine's own resolution server-side, so the screen cannot
     * disagree with what a stage activation will do. Deliberately fetched for
     * the selected group only: resolving every group to fill the list would be
     * one query per member row per group.
     */
    resolveApproverGroup: builder.query<
      ApproverGroupResolution, { id: string; branch?: string | number }
    >({
      query: ({ id, branch }) => ({
        url: `/workflow/approver-groups/${id}/resolve/${branch ? generateQueryString({ branch }) : ""}`,
        method: "GET",
      }),
      // Tagged per group, not with the list tag: a mutation on one group must
      // not re-resolve another, and a delete must not re-resolve the group it
      // just removed (that request 404s and the interceptor would toast it).
      providesTags: (_r, _e, arg) => [{ type: "WorkflowApproverGroups", id: arg.id }],
      // Belt and braces for the same race from another tab or another admin.
      extraOptions: { silent: true },
    }),

    createApproverGroup: builder.mutation<ApproverGroup, ApproverGroupWritePayload>({
      query: (body) => ({ url: `/workflow/approver-groups/`, method: "POST", body }),
      invalidatesTags: [{ type: "WorkflowApproverGroups", id: "LIST" }],
    }),

    updateApproverGroup: builder.mutation<
      ApproverGroup, { id: string; body: ApproverGroupWritePayload }
    >({
      query: ({ id, body }) => ({
        url: `/workflow/approver-groups/${id}/`, method: "PATCH", body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkflowApproverGroups", id: "LIST" },
        { type: "WorkflowApproverGroups", id: arg.id },
      ],
    }),

    // 409 APPROVER_GROUP_IN_USE while a live stage still routes here; the screen
    // owns that message, so the global error toast stays out of the way.
    deleteApproverGroup: builder.mutation<void, string>({
      query: (id) => ({ url: `/workflow/approver-groups/${id}/`, method: "DELETE" }),
      extraOptions: { silent: true },
      // Only the list: the deleted group's own resolution is gone with it, and
      // asking for it again is a guaranteed 404.
      invalidatesTags: [{ type: "WorkflowApproverGroups", id: "LIST" }],
    }),

    // Re-adding an existing member returns 200 with the unchanged group rather
    // than a duplicate, so the picker never has to guard against a double click.
    addApproverGroupMember: builder.mutation<
      ApproverGroup, { id: string; body: ApproverGroupMemberPayload }
    >({
      query: ({ id, body }) => ({
        url: `/workflow/approver-groups/${id}/members/`, method: "POST", body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkflowApproverGroups", id: "LIST" },
        { type: "WorkflowApproverGroups", id: arg.id },
      ],
    }),

    removeApproverGroupMember: builder.mutation<
      ApproverGroup, { id: string; memberId: string }
    >({
      query: ({ id, memberId }) => ({
        url: `/workflow/approver-groups/${id}/members/${memberId}/`, method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkflowApproverGroups", id: "LIST" },
        { type: "WorkflowApproverGroups", id: arg.id },
      ],
    }),

    // ── Dynamic Roles ───────────────────────────────────────────────────────
    getDynamicRoles: builder.query<DynamicRolesResponse, QueryParams | void>({
      query: (params) => ({
        url: `/workflow/dynamic-roles/${params ? generateQueryString(params) : ""}`,
        method: "GET",
      }),
      providesTags: [{ type: "WorkflowDynamicRoles", id: "LIST" }],
    }),

    /**
     * What a Dynamic Role serving these document types may test, and the roles
     * a rule may send to. The server owns both lists, so the screen cannot
     * offer a field or a role that saving would refuse.
     *
     * Silent, because the template page also reads it to put a stage's rules
     * in words, and somebody who may view a template but not approvers gets
     * plainer words rather than an error.
     */
    getDynamicRoleFields: builder.query<DynamicRoleFields, string[]>({
      query: (documentTypes) => ({
        url: `/workflow/dynamic-roles/fields/${documentTypes.length
          ? `?${documentTypes.map((t) => `document_type=${encodeURIComponent(t)}`).join("&")}`
          : ""}`,
        method: "GET",
      }),
      extraOptions: { silent: true },
    }),

    // Refusals name the rule and what is wrong with it, and the editor shows
    // them beside the rules, so the global toast stays out of the way.
    createDynamicRole: builder.mutation<DynamicRole, DynamicRoleWritePayload>({
      query: (body) => ({ url: `/workflow/dynamic-roles/`, method: "POST", body }),
      extraOptions: { silent: true },
      invalidatesTags: [{ type: "WorkflowDynamicRoles", id: "LIST" }],
    }),

    // A stage shows its Dynamic Role's rules, so the templates drop too.
    updateDynamicRole: builder.mutation<
      DynamicRole, { id: string; body: DynamicRoleWritePayload }
    >({
      query: ({ id, body }) => ({ url: `/workflow/dynamic-roles/${id}/`, method: "PATCH", body }),
      extraOptions: { silent: true },
      invalidatesTags: [{ type: "WorkflowDynamicRoles", id: "LIST" }, "WorkflowTemplates"],
    }),

    // 409 DYNAMIC_ROLE_IN_USE while a stage still uses it; the screen owns that message.
    deleteDynamicRole: builder.mutation<void, string>({
      query: (id) => ({ url: `/workflow/dynamic-roles/${id}/`, method: "DELETE" }),
      extraOptions: { silent: true },
      invalidatesTags: [{ type: "WorkflowDynamicRoles", id: "LIST" }],
    }),

    // Unsaved rules tried for a requester and a sample. A 400 carries the reason
    // saving would give, shown beside the tester rather than as a toast.
    previewDynamicRole: builder.mutation<DynamicRolePreviewResult, DynamicRolePreviewPayload>({
      query: (body) => ({ url: `/workflow/dynamic-roles/preview/`, method: "POST", body }),
      extraOptions: { silent: true },
    }),

    // The school's own switch: whether its approvals tell anybody anything.
    // Read on template view, set on template manage - the workflow keys a
    // school already holds, since config.value.* belongs to Codex alone.
    getWorkflowNotificationSetting: builder.query<WorkflowNotificationSetting, void>({
      query: () => ({ url: `/workflow/notification-settings/`, method: "GET" }),
      providesTags: ["WorkflowNotificationSetting"],
    }),

    setWorkflowNotificationSetting: builder.mutation<WorkflowNotificationSetting, boolean>({
      query: (enabled) => ({
        url: `/workflow/notification-settings/`, method: "PATCH", body: { enabled },
      }),
      invalidatesTags: ["WorkflowNotificationSetting"],
    }),

    // ── Stage approver overrides ────────────────────────────────────────────
    // A tenant's own approver for a stage of a template it did not author.
    // Repointing a step is a template-level decision, so these need
    // workflow.template.manage rather than the lighter group rights.
    getStageApproverOverrides: builder.query<
      StageApproverOverridesResponse, QueryParams | void
    >({
      query: (params) => ({
        url: `/workflow/stage-approvers/${params ? generateQueryString(params) : ""}`,
        method: "GET",
      }),
      providesTags: ["WorkflowStageOverrides"],
    }),

    createStageApproverOverride: builder.mutation<
      StageApproverOverride, StageApproverOverridePayload
    >({
      query: (body) => ({ url: `/workflow/stage-approvers/`, method: "POST", body }),
      // The stage's resolved approver changes, so the template read that
      // reports it drops too.
      invalidatesTags: ["WorkflowStageOverrides", "WorkflowTemplates"],
    }),

    // Removing the override restores the template's own approver.
    deleteStageApproverOverride: builder.mutation<void, string>({
      query: (id) => ({ url: `/workflow/stage-approvers/${id}/`, method: "DELETE" }),
      invalidatesTags: ["WorkflowStageOverrides", "WorkflowTemplates"],
    }),

    /**
     * Stop running this tenant's own version of a template and follow the
     * platform's current one again. Returns the platform template now in force.
     *
     * Owns its refusals (no platform version to fall back to), so the global
     * error toast stays out of the way of the screen's own explanation.
     */
    usePlatformTemplateVersion: builder.mutation<WorkflowTemplate, string>({
      query: (id) => ({
        url: `/workflow/templates/${id}/use-platform-version/`, method: "POST",
      }),
      extraOptions: { silent: true },
      invalidatesTags: ["WorkflowTemplates"],
    }),

    // ── Instances ───────────────────────────────────────────────────────────
    getWorkflowInstances: builder.query<WorkflowInstancesResponse, QueryParams>({
      query: (params) => ({ url: `/workflow/instances/${generateQueryString(params)}`, method: "GET" }),
      providesTags: ["WorkflowInstances"],
    }),

    getWorkflowInstance: builder.query<WorkflowInstanceDetail, string>({
      query: (id) => ({ url: `/workflow/instances/${id}/`, method: "GET" }),
      providesTags: ["WorkflowInstances"],
    }),

    // Approver vote - APPROVED / REJECTED / RETURNED.
    recordWorkflowAction: builder.mutation<
      WorkflowInstanceDetail,
      { id: string; action: VoteAction; comment?: string }
    >({
      query: ({ id, action, comment }) => ({
        url: `/workflow/instances/${id}/actions/`,
        method: "POST",
        body: { action, comment: comment ?? "" },
      }),
      invalidatesTags: ["WorkflowInstances", "WorkflowPending", "WorkflowSubmissions", "WorkflowTeamLoad", ...PROC_DOC_TAGS],
    }),

    withdrawWorkflowInstance: builder.mutation<WorkflowInstanceDetail, string>({
      query: (id) => ({ url: `/workflow/instances/${id}/withdraw/`, method: "POST" }),
      invalidatesTags: ["WorkflowInstances", "WorkflowSubmissions", "WorkflowPending", "WorkflowTeamLoad", ...PROC_DOC_TAGS],
    }),

    resubmitWorkflowInstance: builder.mutation<WorkflowInstanceDetail, string>({
      query: (id) => ({ url: `/workflow/instances/${id}/resubmit/`, method: "POST" }),
      invalidatesTags: ["WorkflowInstances", "WorkflowSubmissions", "WorkflowPending", "WorkflowTeamLoad", ...PROC_DOC_TAGS],
    }),

    cancelWorkflowInstance: builder.mutation<WorkflowInstanceDetail, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/workflow/instances/${id}/cancel/`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["WorkflowInstances", "WorkflowSubmissions", "WorkflowPending", "WorkflowTeamLoad", ...PROC_DOC_TAGS],
    }),

    // Admin reverses a recorded vote and re-activates the stage.
    // Step past a stage nobody can approve. Offered only when a submit response
    // came back parked; the backend refuses it if anyone can still decide the
    // stage, so a stale dialog cannot bypass a real reviewer.
    continueWithoutApproval: builder.mutation<
      WorkflowInstanceDetail, { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/workflow/instances/${id}/continue-without-approval/`,
        method: "POST",
        body: reason ? { reason } : {},
      }),
      // This endpoint owns every message it produces, including the refusal.
      // A 409 NOT_PARKED means somebody became able to approve while the dialog
      // was open, which the hook reports as good news; letting the central
      // handler also fire would stack a red "not waiting on an unstaffed
      // approval stage" under a green "it has gone for review instead".
      extraOptions: { silent: true },
      // Releasing the stage may terminate the instance and fire the document's
      // own transition (a payout dispatches, a PO issues), so the business
      // caches drop alongside the workflow ones exactly as a vote does.
      invalidatesTags: [
        "WorkflowInstances", "WorkflowPending", "WorkflowSubmissions", "WorkflowTeamLoad",
        ...PROC_DOC_TAGS,
      ],
    }),

    reverseWorkflowAction: builder.mutation<{ reversal_action_id: string }, { action_id: string; reason: string }>({
      query: ({ action_id, reason }) => ({
        url: `/workflow/actions/${action_id}/reverse/`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["WorkflowInstances", "WorkflowPending", "WorkflowTeamLoad", ...PROC_DOC_TAGS],
    }),

    // ── Dashboards ──────────────────────────────────────────────────────────
    getPendingApprovals: builder.query<PendingApprovalsResponse, void>({
      query: () => ({ url: `/workflow/dashboard/pending/`, method: "GET" }),
      providesTags: ["WorkflowPending"],
    }),

    getMySubmissions: builder.query<WorkflowInstance[], QueryParams | void>({
      query: (params) => ({
        url: `/workflow/dashboard/submitted/${params ? generateQueryString(params) : ""}`,
        method: "GET",
      }),
      providesTags: ["WorkflowSubmissions"],
    }),

    // ── Notifications bell (background polls) ────────────────────────────────
    // Same data as the foreground endpoints, but marked `silent` so a transient
    // 5xx on the focus-resume poll never shows a global error toast. They share
    // the same tags, so foreground mutations still invalidate the bell.
    getPendingApprovalsBell: builder.query<PendingApprovalsResponse, void>({
      query: () => ({ url: `/workflow/dashboard/pending/`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: ["WorkflowPending"],
    }),
    getReturnedSubmissionsBell: builder.query<WorkflowInstance[], void>({
      query: () => ({ url: `/workflow/dashboard/submitted/?status=RETURNED`, method: "GET" }),
      extraOptions: { silent: true },
      providesTags: ["WorkflowSubmissions"],
    }),

    getTeamLoad: builder.query<TeamLoadRow[], void>({
      query: () => ({ url: `/workflow/dashboard/team-load/`, method: "GET" }),
      providesTags: ["WorkflowTeamLoad"],
    }),

    // ── Delegations ─────────────────────────────────────────────────────────
    getDelegations: builder.query<ApprovalDelegationsResponse, QueryParams>({
      query: (params) => ({ url: `/workflow/delegations/${generateQueryString(params)}`, method: "GET" }),
      providesTags: ["WorkflowDelegations"],
    }),

    createDelegation: builder.mutation<ApprovalDelegation, DelegationWritePayload>({
      query: (body) => ({ url: `/workflow/delegations/`, method: "POST", body }),
      invalidatesTags: ["WorkflowDelegations"],
    }),

    updateDelegation: builder.mutation<ApprovalDelegation, { id: string; body: Partial<DelegationWritePayload> }>({
      query: ({ id, body }) => ({ url: `/workflow/delegations/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["WorkflowDelegations"],
    }),

    deleteDelegation: builder.mutation<void, string>({
      query: (id) => ({ url: `/workflow/delegations/${id}/`, method: "DELETE" }),
      invalidatesTags: ["WorkflowDelegations"],
    }),

    revokeDelegation: builder.mutation<ApprovalDelegation, string>({
      query: (id) => ({ url: `/workflow/delegations/${id}/revoke/`, method: "POST" }),
      invalidatesTags: ["WorkflowDelegations"],
    }),

    // Resolve "who would approve?" for an ad-hoc stage config + sample requester,
    // without persisting. Backed by the organogram/RBAC resolver server-side.
    previewApprovers: builder.mutation<ApproverPreviewResult, ApproverPreviewPayload>({
      query: (body) => ({ url: `/workflow/templates/preview-approvers/`, method: "POST", body }),
    }),
  }),
});

export const {
  useGetWorkflowTemplatesQuery,
  useGetWorkflowTemplateQuery,
  useLazyGetWorkflowTemplateQuery,
  usePublishWorkflowTemplateMutation,
  useUsePlatformTemplateVersionMutation,
  useGetTemplateAdoptionQuery,
  useCompareTemplateQuery,
  useGetApproverGroupsQuery,
  useResolveApproverGroupQuery,
  useCreateApproverGroupMutation,
  useUpdateApproverGroupMutation,
  useDeleteApproverGroupMutation,
  useAddApproverGroupMemberMutation,
  useRemoveApproverGroupMemberMutation,
  useGetDynamicRolesQuery,
  useGetDynamicRoleFieldsQuery,
  useCreateDynamicRoleMutation,
  useUpdateDynamicRoleMutation,
  useDeleteDynamicRoleMutation,
  usePreviewDynamicRoleMutation,
  useGetWorkflowNotificationSettingQuery,
  useSetWorkflowNotificationSettingMutation,
  useGetStageApproverOverridesQuery,
  useCreateStageApproverOverrideMutation,
  useDeleteStageApproverOverrideMutation,
  useGetWorkflowInstancesQuery,
  useGetWorkflowInstanceQuery,
  useRecordWorkflowActionMutation,
  useWithdrawWorkflowInstanceMutation,
  useResubmitWorkflowInstanceMutation,
  useCancelWorkflowInstanceMutation,
  useContinueWithoutApprovalMutation,
  useReverseWorkflowActionMutation,
  useGetPendingApprovalsQuery,
  useGetMySubmissionsQuery,
  useGetPendingApprovalsBellQuery,
  useGetReturnedSubmissionsBellQuery,
  useGetTeamLoadQuery,
  useGetDelegationsQuery,
  useCreateDelegationMutation,
  useUpdateDelegationMutation,
  useDeleteDelegationMutation,
  useRevokeDelegationMutation,
  usePreviewApproversMutation,
} = workflowApi;
