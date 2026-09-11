import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  UserCheck,
  Users,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/custom/surface";
import { cn } from "@/lib/utils";
import type {
  StudentStatus,
  StudentSummary,
} from "@/redux/services/students/students-types";

import type { QueueRow } from "./work-queue";

interface Metric {
  label: string;
  value: number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  onClick?: () => void;
}

/**
 * Summarises the student roll and the records that need action.
 *
 * Every count comes from the branch and session scoped summary. Queue entries
 * name a record and a next action so the numbers remain useful rather than
 * becoming decorative dashboard statistics.
 */
export function OverviewCard({
  summary,
  loading,
  queue,
  overflow,
  settledLine,
  onPickStatus,
  onAct,
  onOpenApplicants,
}: {
  summary?: StudentSummary;
  loading?: boolean;
  queue: QueueRow[];
  overflow: number;
  settledLine?: string;
  onPickStatus: (status: StudentStatus) => void;
  onAct: (row: QueueRow) => void;
  onOpenApplicants: () => void;
}) {
  const attention = (summary?.applicants ?? 0) + (summary?.unassigned ?? 0);
  const metrics: Metric[] = [
    {
      label: "Total students",
      value: summary?.total ?? 0,
      note: `${summary?.on_roll ?? 0} currently on the roll`,
      icon: Users,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Active",
      value: summary?.active ?? 0,
      note: "Open active records",
      icon: UserCheck,
      tone: "bg-emerald-50 text-emerald-700",
      onClick: () => onPickStatus("ACTIVE"),
    },
    {
      label: "Applicants",
      value: summary?.applicants ?? 0,
      note: "Waiting for a decision",
      icon: ClipboardList,
      tone: "bg-violet-50 text-violet-700",
      onClick: () => onPickStatus("APPLICANT"),
    },
    {
      label: "Needs attention",
      value: attention,
      note: `${summary?.unassigned ?? 0} without a class`,
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} loading={loading} />
        ))}
      </div>

      <Panel as="section" className="overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <span className="grid size-9 shrink-0 place-content-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-black-01">
              Student work queue
            </h3>
            <p className="text-xs text-gray-05">
              Quick actions that keep the student roll ready for school work.
            </p>
          </div>
          {overflow > 0 && (
            <button
              type="button"
              onClick={onOpenApplicants}
              className="text-xs font-medium text-primary hover:underline"
            >
              {overflow} more waiting
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <div className="px-4 py-5 sm:px-5">
            <p className="text-sm font-medium text-black-01">
              Nothing needs attention.
            </p>
            <p className="mt-1 text-xs text-gray-05">
              {settledLine ??
                "Every student on the roll has a class and no application is waiting."}
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
            {queue.map((row) => (
              <li key={row.id} className="min-w-0 bg-white">
                <button
                  type="button"
                  onClick={() => onAct(row)}
                  aria-label={`${row.actionLabel}: ${row.title}`}
                  className="group flex h-full w-full min-w-0 items-center gap-3 px-4 py-4 text-left hover:bg-white-05 sm:px-5"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-9 shrink-0 place-content-center rounded-lg text-sm font-semibold",
                      row.tone === "alert"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-violet-50 text-violet-700",
                    )}
                  >
                    {row.marker}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-black-01">
                      {row.title}
                    </span>
                    <span className="block truncate text-xs text-gray-05">
                      {row.detail}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-gray-05 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              </li>
            ))}
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
