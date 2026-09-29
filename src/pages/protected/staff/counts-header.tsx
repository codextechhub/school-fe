import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileMinus,
  GraduationCap,
  Hourglass,
  LockKeyhole,
  Mail,
  UserCheck,
  Users,
} from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  EmploymentStatus,
  StaffCounts,
} from "@/redux/services/staff/staff-types";

interface Metric {
  label: string;
  value: number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  onClick?: () => void;
}

interface AttentionItem {
  key: string;
  count: number;
  label: string;
  action: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  onClick: () => void;
}

/**
 * Summarises employment, teaching, and account issues for the staff directory.
 *
 * Employment and account facts stay separate. The attention row uses only
 * counts the list response provides, so it never invents missing postings or
 * records the API cannot identify. Missing documents are the school's own
 * list of expected types (Settings, Staff), and the count is null for a reader
 * without the records key, who gets no item for it rather than a zero.
 *
 * People on leave and invitations held for go-live are listed as information
 * and left out of the Needs attention figure: nobody has to act on either.
 */
export function CountsHeader({
  counts,
  loading,
  onPickStatus,
  onPickLocked,
  onPickTeaching,
  onPickMissingDocuments,
}: {
  counts?: StaffCounts;
  loading?: boolean;
  onPickStatus: (status: EmploymentStatus) => void;
  onPickLocked: () => void;
  onPickTeaching: () => void;
  onPickMissingDocuments: () => void;
}) {
  const statusCount = (status: EmploymentStatus) =>
    counts?.by_employment_status.find((row) => row.value === status)?.count ?? 0;
  const invited = statusCount("INVITED");
  const awaitingApproval = statusCount("PENDING_APPROVAL");
  const heldForGoLive = statusCount("AWAITING_GO_LIVE");
  const missingDocuments = counts?.missing_documents ?? 0;
  const onLeave = statusCount("ON_LEAVE");
  const locked = counts?.locked_accounts ?? 0;
  // Every item the attention panel lists, except leave and invitations held
  // for go-live, which are not faults.
  const needsAttention = awaitingApproval + invited + locked + missingDocuments;

  const metrics: Metric[] = [
    {
      label: "Total staff",
      value: counts?.total ?? 0,
      note: "Every staff record",
      icon: Users,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Currently employed",
      value: counts?.currently_employed ?? 0,
      note: "Still on the staff roll",
      icon: UserCheck,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Teaching staff",
      value: counts?.with_teaching_duties ?? 0,
      note: "With teaching assignments",
      icon: GraduationCap,
      tone: "bg-violet-50 text-violet-700",
      onClick: onPickTeaching,
    },
    {
      label: "Needs attention",
      value: needsAttention,
      note: "Hires, invitations, locks and documents",
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  const attention: AttentionItem[] = [
    awaitingApproval > 0 && {
      key: "awaiting-approval",
      count: awaitingApproval,
      label: awaitingApproval === 1 ? "hire awaiting approval" : "hires awaiting approval",
      action: "Review hires",
      icon: Hourglass,
      tone: "bg-yellow-01/10 text-yellow-01-text",
      onClick: () => onPickStatus("PENDING_APPROVAL"),
    },
    invited > 0 && {
      key: "invited",
      count: invited,
      label: invited === 1 ? "invitation pending" : "invitations pending",
      action: "Review invitations",
      icon: Mail,
      tone: "bg-amber-50 text-amber-700",
      onClick: () => onPickStatus("INVITED"),
    },
    locked > 0 && {
      key: "locked",
      count: locked,
      label: locked === 1 ? "account locked" : "accounts locked",
      action: "Review accounts",
      icon: LockKeyhole,
      tone: "bg-red-50 text-red-700",
      onClick: onPickLocked,
    },
    missingDocuments > 0 && {
      key: "missing-documents",
      count: missingDocuments,
      label:
        missingDocuments === 1
          ? "person missing documents"
          : "people missing documents",
      action: "Review records",
      icon: FileMinus,
      tone: "bg-amber-50 text-amber-700",
      onClick: onPickMissingDocuments,
    },
    heldForGoLive > 0 && {
      key: "held-for-go-live",
      count: heldForGoLive,
      label:
        heldForGoLive === 1
          ? "invitation held for go-live"
          : "invitations held for go-live",
      action: "Sent when the school goes live",
      icon: Mail,
      tone: "bg-blue-50 text-blue-700",
      onClick: () => onPickStatus("AWAITING_GO_LIVE"),
    },
    onLeave > 0 && {
      key: "leave",
      count: onLeave,
      label: onLeave === 1 ? "person on leave" : "people on leave",
      action: "View absences",
      icon: CalendarClock,
      tone: "bg-violet-50 text-violet-700",
      onClick: () => onPickStatus("ON_LEAVE"),
    },
  ].filter(Boolean) as AttentionItem[];

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} loading={loading} />
        ))}
      </div>

      <Panel as="section" className="overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <span className="grid size-9 shrink-0 place-content-center rounded-lg bg-amber-50 text-amber-700">
            <AlertTriangle className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-black-01">
              Staff attention
            </h3>
            <p className="text-xs text-gray-05">
              Employment and account items that may need an administrator.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-2.5 p-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : attention.length === 0 ? (
          <div className="px-4 py-5 sm:px-5">
            <p className="text-sm font-medium text-black-01">
              Nothing needs attention.
            </p>
            <p className="mt-1 text-xs text-gray-05">
              No invitation is pending and no staff account is locked.
            </p>
          </div>
        ) : (
          <ul
            className="grid gap-px bg-border"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
            }}
          >
            {attention.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key} className="min-w-0 bg-white">
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="group flex h-full w-full min-w-0 items-center gap-3 px-4 py-4 text-left hover:bg-white-05 sm:px-5"
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-content-center rounded-lg",
                        item.tone,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-black-01">
                        {item.count} {item.label}
                      </span>
                      <span className="block text-xs text-gray-05">
                        {item.action}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-gray-05 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function MetricCard({ metric, loading }: { metric: Metric; loading?: boolean }) {
  const Icon = metric.icon;
  const content = (
    <>
      <span
        className={cn(
          "grid size-9 shrink-0 place-content-center rounded-lg",
          metric.tone,
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-gray-01">
          {metric.label}
        </span>
        {loading ? (
          <Skeleton className="mt-1.5 h-7 w-16" />
        ) : (
          <span className="mt-1 block text-2xl font-semibold leading-none text-black-01">
            {metric.value.toLocaleString()}
          </span>
        )}
        <span className="mt-2 block text-[11px] leading-4 text-gray-05">
          {metric.note}
        </span>
      </span>
    </>
  );

  return (
    <Panel
      as="section"
      className={cn(
        "rounded-xl p-4 sm:p-5",
        metric.onClick &&
          "transition-colors hover:border-primary/30 hover:bg-white-05",
      )}
    >
      {metric.onClick ? (
        <button
          type="button"
          onClick={metric.onClick}
          className="flex w-full min-w-0 items-start gap-3 text-left"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 items-start gap-3">{content}</div>
      )}
    </Panel>
  );
}
