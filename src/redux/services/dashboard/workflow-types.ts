/**
 * vs_workflow - TypeScript contract.
 *
 * Mirrors apps/vs_workflow serializers + constants exactly.
 *
 * Envelope notes (verified against backend):
 *   • List endpoints (templates / instances / delegations) are paginated by
 *     core.pagination.XVSPagination → { success, message, pagination, data }.
 *   • Detail + action endpoints return the PLAIN serializer dict (no wrapper).
 *   • Dashboard endpoints: /pending/ → { results, count }; /submitted/ and
 */
//     /team-load/ return a plain array.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaginatedResponse } from "./rbac-types";

// ── Enums (string unions, matching vs_workflow.constants) ────────────────────

export type WorkflowInstanceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "RETURNED"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "CANCELLED";

export type WorkflowStageStatus =
  | "PENDING"
  | "ACTIVE"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "SKIPPED";

export type WorkflowStageActionKind = "APPROVED" | "REJECTED" | "RETURNED" | "WITHDRAWN";

/** Actions an approver can submit via POST /instances/{id}/actions/. */
export type VoteAction = "APPROVED" | "REJECTED" | "RETURNED";

export type StageAdvanceRule = "UNANIMOUS" | "QUORUM" | "ANY";
export type StageOnRejection = "TERMINAL" | "RETURN_TO_REQUESTER";
export type ApproverScope = "BRANCH" | "SCHOOL" | "PLATFORM";
export type StageKind = "APPROVAL" | "BRANCH";

export type AuditEventType =
  | "INSTANCE_SUBMITTED"
  | "INSTANCE_WITHDRAWN"
  | "INSTANCE_CANCELLED"
  | "INSTANCE_APPROVED"
  | "INSTANCE_REJECTED"
  | "INSTANCE_RETURNED"
  | "INSTANCE_RESUBMITTED"
  | "STAGE_ACTIVATED"
  | "STAGE_APPROVED"
  | "STAGE_REJECTED"
  | "STAGE_SKIPPED_NO_APPROVER"
  | "STAGE_SKIPPED_CONDITION"
  | "APPROVER_ACTED"
  | "ACTION_REVERSED"
  | "ROUTE_EVALUATED";

/** Declarative condition JSON used on routes + stage inclusion_condition. */
export type WorkflowCondition =
  | { op: string; field: string; value: unknown }
  | { all: WorkflowCondition[] }
  | { any: WorkflowCondition[] }
  | { not: WorkflowCondition }
  | { fn: string; args?: Record<string, unknown> }
  | null;

// ── Templates ────────────────────────────────────────────────────────────────

/**
 * One "when this, then that role" rule on a DYNAMIC_ROLE stage.
 *
 * Rules are evaluated in ascending `order` and the first match wins. A rule
 * with a null condition always matches, so the backend requires it to be last -
 * anything after it could never fire.
 */
export interface WorkflowStageDynamicRule {
  id: string;
  order: number;
  condition: WorkflowCondition;
  role_key: string;
  role_name: string | null;
  label: string;
  is_fallback: boolean;
}

/** One rule as the publish endpoint accepts it (no ids; rules are replaced). */
export interface DynamicRulePayload {
  order: number;
  condition: WorkflowCondition;
  role_key: string;
  label?: string;
}

export interface WorkflowStage {
  id: string;
  code: string;
  label: string;
  kind: StageKind;
  order: number;
  approver_source: ApproverSource;
  approver_scope: ApproverScope;
  /** ROLE source: the role key whose active holders approve, + its display name. */
  approver_role_key: string;
  approver_role_name?: string | null;
  /** WORKFLOW_GROUP source: the named pool this stage routes to. */
  approver_group_code?: string | null;
  approver_group_name?: string | null;
  /** DYNAMIC_ROLE source: ordered rules, first match wins. Empty otherwise. */
  dynamic_role_rules?: WorkflowStageDynamicRule[];
  organogram_target: OrganogramTarget | "";
  organogram_levels: number;
  organogram_position_code: string | null;
  advance_rule: StageAdvanceRule;
  quorum_count: number;
  on_rejection: StageOnRejection;
  skip_if_no_approvers: boolean;
  inclusion_condition: WorkflowCondition;
}

export interface WorkflowRoutePath {
  id: string;
  from_stage_code: string | null;
  to_stage_code: string | null;
  order: number;
  condition: WorkflowCondition;
}

export interface WorkflowTemplate {
  id: string;
  /**
   * Owning tenant; null means the template is *central* - one definition shared
   * by every tenant. Serialized as `tenant`, not `school`: reading the wrong
   * name yields undefined, which reads as "central" and is wrong for every
   * tenant-owned template.
   */
  tenant: string | number | null;
  branch: string | number | null;
  document_type: string;
  code: string;
  name: string;
  description: string;
  notification_events: Record<string, boolean>;
  /**
   * A tenant that went back to the platform's version has its own switched off
   * rather than deleted: instances protect the template they ran under, so the
   * version that has actually been used is the one that cannot be removed.
   */
  is_active: boolean;
  /** This row is the shared definition every tenant starts on. */
  is_platform: boolean;
  /** Platform rows only: this tenant is running its own version instead. */
  tenant_has_own: boolean | null;
  /** Tenant rows only: when the shared version it came from last changed. */
  platform_updated_at: string | null;
  /** Tenant rows only: the shared version moved on after this tenant last saved. */
  platform_changed_since: boolean;
  created_at: string;
  updated_at: string;
  stages: WorkflowStage[];
  routes: WorkflowRoutePath[];
}

/** Stage payload accepted by POST /templates/publish/ (server upserts by code). */
export interface WorkflowStagePayload {
  code: string;
  label: string;
  kind: StageKind;
  order: number;
  approver_source?: ApproverSource;
  approver_scope?: ApproverScope;
  approver_role_key?: string;
  approver_group_code?: string;
  dynamic_role_rules?: DynamicRulePayload[];
  organogram_target?: OrganogramTarget | "";
  organogram_levels?: number;
  organogram_position_code?: string;
  advance_rule?: StageAdvanceRule;
  quorum_count?: number;
  on_rejection?: StageOnRejection;
  skip_if_no_approvers?: boolean;
  inclusion_condition?: WorkflowCondition;
}

export interface WorkflowRoutePayload {
  from_stage_code?: string | null;
  to_stage_code?: string | null;
  order?: number;
  condition?: WorkflowCondition;
}

export interface PublishTemplatePayload {
  /**
   * PLATFORM writes the shared definition and is refused unless the caller's own
   * tenant is the platform one. TENANT (the default) writes the caller's own
   * version, which the engine prefers for that tenant from then on.
   */
  scope?: "TENANT" | "PLATFORM";
  document_type: string;
  code: string;
  name: string;
  description?: string;
  notification_events?: Record<string, boolean>;
  stages: WorkflowStagePayload[];
  routes?: WorkflowRoutePayload[];
}

// ── Platform oversight (shared template vs a tenant's own) ───────────────────

/** One tenant running its own version of a shared template. */
export interface TemplateAdopter {
  tenant_slug: string;
  tenant_name: string;
  template_id: string;
  branch: string | number | null;
  stage_count: number;
  updated_at: string;
}

/**
 * `GET /templates/{id}/adoption/` - platform only.
 *
 * Answers "who actually gets it if I edit this": everyone who has not adjusted
 * it runs the published version, including tenants that never opened it.
 */
export interface TemplateAdoption {
  template: { id: string; name: string; document_type: string; code: string; updated_at: string };
  customer_count: number;
  following_count: number;
  adjusted_count: number;
  adjusted: TemplateAdopter[];
}

/** One setting that differs, with both sides as stored. */
export interface TemplateFieldDiff {
  field: string;
  label: string;
  base: unknown;
  other: unknown;
}

export interface TemplateStageDiff {
  code: string;
  label: string;
  fields: TemplateFieldDiff[];
}

/**
 * `GET /templates/{id}/compare/?with=<id>` - platform only.
 *
 * "Added" and "removed" read from the platform's point of view: added is a
 * stage only the tenant has.
 */
export interface TemplateComparison {
  base: { id: string; name: string; updated_at: string };
  other: {
    id: string; name: string; tenant_slug: string; tenant_name: string; updated_at: string;
  };
  template_fields: TemplateFieldDiff[];
  stages: {
    added: { code: string; label: string }[];
    removed: { code: string; label: string }[];
    changed: TemplateStageDiff[];
  };
  routes_differ: boolean;
  identical: boolean;
}

// ── Instances ────────────────────────────────────────────────────────────────

export interface WorkflowStageAction {
  id: string;
  action: WorkflowStageActionKind;
  actor: string;
  on_behalf_of: string | null;
  comment: string;
  attempt: number;
  acted_at: string;
  reversed_at: string | null;
  reversed_by: string | null;
  reversal_reason: string;
  is_reversal_of: string | null;
}

export interface WorkflowStageApprover {
  id: string;
  user: string;
  on_behalf_of: string | null;
  attempt: number;
  recorded_at: string;
}

export interface WorkflowStageInstance {
  id: string;
  stage_code: string;
  stage_label: string;
  stage_kind: StageKind;
  status: WorkflowStageStatus;
  // Denormalised from the stage definition (see serializer).
  on_rejection: StageOnRejection;
  advance_rule: StageAdvanceRule;
  quorum_count: number;
  activated_at: string | null;
  resolved_at: string | null;
  skip_reason: string;
  attempt: number;
  eligible_approvers: WorkflowStageApprover[];
  actions: WorkflowStageAction[];
}

export interface WorkflowAuditLog {
  id: string;
  event_type: AuditEventType;
  actor: string | null;
  stage_instance: string | null;
  context: Record<string, unknown>;
  message: string;
  occurred_at: string;
}

export interface WorkflowInstance {
  id: string;
  document_type: string;
  document_object_id: string;
  template_code: string;
  status: WorkflowInstanceStatus;
  current_stage_code: string | null;
  current_stage_label: string | null;
  requested_by: string;
  submitted_at: string | null;
  completed_at: string | null;
  /** Last activity - bumps on every state change. */
  updated_at: string;
}

/** Display-only snapshot of the business document, captured at submission. */
export interface DocumentSummaryField {
  label: string;
  value: string;
}
export interface DocumentSummary {
  title?: string;
  subtitle?: string;
  fields?: DocumentSummaryField[];
  link?: string;
}

/** Read-only preview of where an approval sends the request next. */
export interface NextStagePreview {
  label: string | null;
  is_final: boolean;
}

export interface WorkflowInstanceDetail extends WorkflowInstance {
  /** Empty object when the document's handler provides no summary. */
  document_summary: DocumentSummary;
  /** Null when the instance isn't awaiting a decision. */
  next_stage: NextStagePreview | null;
  stage_instances: WorkflowStageInstance[];
  audit_logs: WorkflowAuditLog[];
}

/** One row from GET /dashboard/pending/ - list shape + queue metadata. */
export interface PendingApproval extends WorkflowInstance {
  awaiting_on_stage: string;
  /** When the stage activated - i.e. when it reached this approver's queue. */
  awaiting_since: string | null;
  on_behalf_of: string | null;
}

export interface PendingApprovalsResponse {
  results: PendingApproval[];
  count: number;
}

export interface TeamLoadRow {
  document_type: string;
  stage_code: string;
  stage_label: string | null;
  active_count: number;
}

// ── Delegations ────────────────────────────────────────────────────────────────

export interface ApprovalDelegation {
  id: string;
  delegator: string;
  delegate: string;
  starts_at: string;
  ends_at: string;
  document_type: string;
  exclusive: boolean;
  reason: string;
  created_at: string;
  revoked_at: string | null;
}

export interface DelegationWritePayload {
  delegate: string;
  starts_at: string;
  ends_at: string;
  document_type?: string;
  exclusive?: boolean;
  reason?: string;
}

// ── Approver groups (the Approvers screen) ───────────────────────────────────

/** What one membership row points at. USER is static; ROLE/POSITION resolve live. */
export type GroupMemberKind = "USER" | "ROLE" | "POSITION";

/**
 * One membership row as the group endpoints serialize it.
 *
 * The read serializer deliberately carries no live resolution: listing many
 * groups would otherwise run a resolution query per row. "Resolves to N people"
 * comes from the resolve endpoint, per group, on demand.
 */
export interface ApproverGroupMember {
  id: string;
  kind: GroupMemberKind;
  user: string | number | null;
  user_name: string | null;
  user_email: string | null;
  role: string | number | null;
  role_key: string | null;
  role_name: string | null;
  position: string | number | null;
  position_code: string | null;
  position_title: string | null;
  added_at: string;
}

export interface ApproverGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  branch: string | number | null;
  is_active: boolean;
  members: ApproverGroupMember[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApproverGroupResolvedUser {
  id: string;
  name: string;
  email: string;
}

/** One member row plus who it reaches right now, from the engine's own resolver. */
export interface ApproverGroupResolvedMember {
  id: string;
  kind: GroupMemberKind;
  label: string;
  target_code: string | null;
  resolved_count: number;
  resolved_users: ApproverGroupResolvedUser[];
}

/**
 * `GET /approver-groups/{id}/resolve/` - the live picture behind the screen.
 *
 * `resolved_count` is the de-duplicated union, so a person reachable through two
 * members is counted once. Every number the detail pane shows comes from here
 * rather than from client-side arithmetic over `members`.
 */
export interface ApproverGroupResolution {
  group: { id: string; code: string; name: string; is_active: boolean };
  members: ApproverGroupResolvedMember[];
  resolved_count: number;
  resolved_users: ApproverGroupResolvedUser[];
}

export interface ApproverGroupWritePayload {
  code?: string;
  name?: string;
  description?: string;
  branch?: string | number | null;
  is_active?: boolean;
}

/** Exactly one target field must match `kind`; the API re-checks it server-side. */
/**
 * One tenant's own approver for a stage of a template it did not author.
 *
 * Central templates are shared by every tenant, so repointing one step must not
 * mean cloning the whole template. Only *who approves* changes: advance rule,
 * rejection policy and routing stay with the template.
 */
export interface StageApproverOverride {
  id: string;
  stage: string;
  stage_code: string;
  stage_label: string;
  template_code: string;
  document_type: string;
  is_central: boolean;
  approver_source: "ROLE" | "WORKFLOW_GROUP";
  approver_role_key: string;
  approver_group: string | null;
  approver_group_code: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface StageApproverOverridePayload {
  stage: string;
  approver_source: "ROLE" | "WORKFLOW_GROUP";
  approver_role_key?: string;
  approver_group?: string | null;
  note?: string;
}

export interface ApproverGroupMemberPayload {
  kind: GroupMemberKind;
  user?: string;
  role_key?: string;
  position_code?: string;
}

// ── Convenience aliases for list responses ───────────────────────────────────

export type WorkflowTemplatesResponse = PaginatedResponse<WorkflowTemplate>;
export type ApproverGroupsResponse = PaginatedResponse<ApproverGroup>;
export type StageApproverOverridesResponse = PaginatedResponse<StageApproverOverride>;
export type WorkflowInstancesResponse = PaginatedResponse<WorkflowInstance>;
export type ApprovalDelegationsResponse = PaginatedResponse<ApprovalDelegation>;

// ── Approver preview (the engine's own resolver, unsaved config) ─────────────

/**
 * How a stage resolves its approvers.
 *
 * `RBAC_PERMISSION` was removed from the engine: permission keys are a
 * developer vocabulary a template builder cannot be expected to know, and every
 * key resolved through roles anyway. `ROLE` names the same authority in the
 * words an administrator already uses.
 */
export type ApproverSource = "ROLE" | "WORKFLOW_GROUP" | "DYNAMIC_ROLE" | "ORGANOGRAM";
export type OrganogramTarget =
  | "DIRECT_MANAGER"
  | "N_LEVELS_UP"
  | "DEPARTMENT_HEAD"
  | "SPECIFIC_POSITION";

export interface ApproverPreviewPayload {
  requester: string;
  approver_source: ApproverSource;
  organogram_target?: OrganogramTarget | "";
  organogram_levels?: number;
  organogram_position_code?: string;
  approver_role_key?: string;
  approver_group_code?: string;
  /** DYNAMIC_ROLE: the unsaved rules, tried against `sample_document`. */
  dynamic_role_rules?: DynamicRulePayload[];
  sample_document?: Record<string, unknown>;
  approver_scope?: ApproverScope;
  document_type?: string;
}

/** One rule's evaluation in a dynamic-role preview, in evaluation order. */
export interface DynamicRuleEvaluation {
  order: number;
  role_key: string;
  role_name: string;
  is_fallback: boolean;
  /** The evaluator's own trace tree; rendered as-is, never re-derived here. */
  trace: { kind: string; result: boolean; [k: string]: unknown };
  picked: boolean;
}

export interface DynamicRolePreview {
  matched_role_key: string | null;
  matched_role_name: string | null;
  evaluations: DynamicRuleEvaluation[];
  /** Present only when nothing matched and there is no fallback rule. */
  note?: string;
}

export interface ApproverPreviewUser {
  id: string;
  full_name: string;
  email: string;
}

export interface ApproverPreviewResult {
  approver_source: ApproverSource;
  organogram_target: OrganogramTarget | null;
  count: number;
  approvers: { user: ApproverPreviewUser; on_behalf_of: ApproverPreviewUser | null }[];
  /** Only on a DYNAMIC_ROLE preview: which rule won, and why. */
  dynamic_role?: DynamicRolePreview;
}

/**
 * Whether a just-submitted document can actually be approved by anyone.
 *
 * Returned by every "submit for approval" endpoint (procurement, payouts,
 * finance) under `approval`. A workflow stage whose approving permission nobody
 * holds activates with an empty approver snapshot and the document *parks*: it
 * is submitted, it is waiting, and there is no one who can move it. The submit
 * screen uses this to warn at the moment it happens rather than letting the
 * document sit until somebody notices.
 *
 * `requirement` is a ready-made sentence naming what would give the stage an
 * approver, so the warning can say how to fix it properly instead of just "no
 * approver". Always populated. Render this.
 *
 * `role_key` is only meaningful when `approver_source` is `ROLE`, and the
 * backend blanks it otherwise. Anything richer than `requirement` must check the
 * source first: showing a role key for a stage that resolves by group, by
 * document rule, or off the organogram would send someone to fill a role that
 * decides nothing here.
 */
export interface ApprovalParkState {
  parked: boolean;
  instance_id: string;
  stage_code?: string;
  stage_label?: string;
  /**
   * Deliberately a loose `string`, not the `ApproverSource` union above: this
   * field is only ever compared and displayed, never used to build a request,
   * and a source added on the server must not make this payload untypeable
   * before the union catches up.
   */
  approver_source?: string;
  role_key?: string;
  requirement?: string;
  document_type?: string;
}
