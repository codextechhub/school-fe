import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

// Every screen here comes from @xvs/finance and is the same one the CodeX
// console renders. Route-level code splitting: each loads on first visit.
const PendingApprovals = lazy(() => import("@/pages/protected/workflow/approvals"));
const ApprovalDetail = lazy(() => import("@/pages/protected/workflow/approvals/approval-detail"));
const MySubmissions = lazy(() => import("@/pages/protected/workflow/my-submissions"));
const SubmissionDetail = lazy(() => import("@/pages/protected/workflow/my-submissions/submission-detail"));
const Delegations = lazy(() => import("@/pages/protected/workflow/delegations"));
const ManageApprovals = lazy(() => import("@/pages/protected/workflow/instances"));
const InstanceDetail = lazy(() => import("@/pages/protected/workflow/instances/instance-detail"));
const ApproverGroups = lazy(() => import("@/pages/protected/workflow/approver-groups"));
const Templates = lazy(() => import("@/pages/protected/workflow/templates"));
const TemplateDetail = lazy(() => import("@/pages/protected/workflow/templates/template-detail"));
const TemplateBuilder = lazy(() => import("@/pages/protected/workflow/templates/template-builder"));

const W = routesPath.PROTECTED.WORKFLOW;

/**
 * The workflow surface a school gets.
 *
 * Deliberately not the console's whole set. Manage Approvals is here, because a
 * school admin looks after the school's requests: finds the ones stuck on
 * somebody who is away and changes who approves them. The sidebar offers it
 * only to a reader who may view every request. Team Load is not: it compares
 * queues across document types, which is the platform's question rather than a
 * school's.
 */
export const workflowRoutes = [
  { path: W.APPROVALS, Component: PendingApprovals, handle: { title: "Approvals" } satisfies DashboardHandle },
  { path: W.APPROVAL_DETAIL, Component: ApprovalDetail, handle: { title: "Approval", hasBack: true } satisfies DashboardHandle },
  { path: W.MY_SUBMISSIONS, Component: MySubmissions, handle: { title: "My Submissions" } satisfies DashboardHandle },
  { path: W.SUBMISSION_DETAIL, Component: SubmissionDetail, handle: { title: "Submission", hasBack: true } satisfies DashboardHandle },
  { path: W.DELEGATIONS, Component: Delegations, handle: { title: "Delegations" } satisfies DashboardHandle },
  { path: W.INSTANCES, Component: ManageApprovals, handle: { title: "Manage Approvals" } satisfies DashboardHandle },
  { path: W.INSTANCE_DETAIL_PATH, Component: InstanceDetail, handle: { title: "Approval request", hasBack: true } satisfies DashboardHandle },
  { path: W.APPROVER_GROUPS, Component: ApproverGroups, handle: { title: "Approvers" } satisfies DashboardHandle },
  // Approval emails live in Settings > Notifications; the old address follows them.
  { path: W.NOTIFICATIONS, element: <Navigate to={routesPath.PROTECTED.SETTINGS.NOTIFICATIONS} replace /> },
  // No TEMPLATE_NEW. A school adjusts the approval paths it was given rather
  // than authoring new ones, so the builder is reachable only through EDIT, on
  // a template that already exists. See createsWorkflowTemplates in xvs-host.
  { path: W.TEMPLATES, Component: Templates, handle: { title: "Templates" } satisfies DashboardHandle },
  { path: W.TEMPLATE_DETAIL, Component: TemplateDetail, handle: { title: "Template", hasBack: true } satisfies DashboardHandle },
  { path: W.TEMPLATE_EDIT, Component: TemplateBuilder, handle: { title: "Edit Template", hasBack: true } satisfies DashboardHandle },
] as RouteObject[];
