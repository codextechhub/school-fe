import {
  BookOpen,
  Coffee,
  Megaphone,
  Pencil,
  Trash2,
  Utensils,
} from "lucide-react";

import { CardActions, ClickableCard, Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  DayOfWeek,
  Period,
  PeriodType,
} from "@/redux/services/calendar/calendar-types";
import { RowActions } from "../components/row-actions";
import { durationOf, formatClock } from "./bell-schedule-time";

export type BellDay = DayOfWeek | "all";

const DAY_TABS: { value: BellDay; label: string; short: string }[] = [
  { value: "all", label: "Every day", short: "Every day" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
];

const TYPE_STYLE: Record<
  PeriodType,
  {
    icon: typeof BookOpen;
    badge: "blue" | "amber" | "teal" | "green";
    block: string;
  }
> = {
  LESSON: {
    icon: BookOpen,
    badge: "blue",
    block: "border-primary/20 bg-white text-black-01",
  },
  BREAK: {
    icon: Coffee,
    badge: "amber",
    block: "border-yellow-01/20 bg-yellow-01/5 text-yellow-01-text",
  },
  LUNCH: {
    icon: Utensils,
    badge: "teal",
    block: "border-[#0F6E56]/15 bg-[#E1F5EE]/60 text-[#0F6E56]",
  },
  ASSEMBLY: {
    icon: Megaphone,
    badge: "green",
    block: "border-green-01/20 bg-green-01/5 text-green-01-text",
  },
};

/**
 * A clock-led preview of the periods that actually run on the selected day.
 * Block widths follow their duration, so the picture agrees with the times.
 */
export function SchoolDayPanel({
  day,
  periods,
  ownDays,
  label,
  note,
  canEdit,
  onDayChange,
  onEdit,
}: {
  day: BellDay;
  periods: Period[];
  ownDays: Set<DayOfWeek>;
  label: string;
  note?: string;
  canEdit: boolean;
  onDayChange: (day: BellDay) => void;
  onEdit: (period: Period) => void;
}) {
  const lessons = periods.filter((period) => period.period_type === "LESSON").length;

  return (
    <Panel as="section" className="overflow-hidden">
      <div className="flex min-w-0 flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-mont text-[15px] font-semibold text-black-01">
            The school day
          </h2>
          <p className="mt-1 text-[13px] text-gray-05 text-pretty">{label}</p>
        </div>

        <div className="max-w-full overflow-x-auto pb-1">
          <div className="inline-flex min-w-max gap-1.5">
            {DAY_TABS.map((tab) => {
              const selected = day === tab.value;
              const hasOwnSchedule =
                tab.value !== "all" && ownDays.has(tab.value);
              return (
                <button
                  key={String(tab.value)}
                  type="button"
                  onClick={() => onDayChange(tab.value)}
                  aria-pressed={selected}
                  className={cn(
                    "h-8 whitespace-nowrap rounded-md border px-3 font-mont text-xs font-medium transition-colors",
                    selected
                      ? "border-primary bg-pry-01 text-primary"
                      : "border-border bg-white text-gray-06 hover:border-primary/40 hover:bg-pry-01/30",
                  )}
                >
                  {tab.short}
                  {hasOwnSchedule && (
                    <span
                      className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle"
                      aria-label="Has its own schedule"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {note && (
          <p className="mb-4 rounded-lg border border-primary/20 bg-pry-01/30 px-3 py-2 text-xs text-gray-06 text-pretty">
            {note}
          </p>
        )}

        <div className="max-w-full overflow-x-auto pb-1">
          <div className="flex h-20 min-w-[680px] overflow-hidden rounded-lg border border-border bg-white">
            {periods.map((period) => {
              const style = TYPE_STYLE[period.period_type];
              const Icon = style.icon;
              const duration = durationOf(period);
              const content = (
                <>
                  <span className="flex min-w-0 items-center justify-center gap-1.5">
                    <Icon className="hidden size-3.5 shrink-0 lg:block" />
                    <span className="truncate font-mont text-xs font-semibold">
                      {period.label}
                    </span>
                  </span>
                  {duration >= 30 && (
                    <span className="mt-1 whitespace-nowrap text-[10px] opacity-75">
                      {formatClock(period.start_time)}
                    </span>
                  )}
                </>
              );

              return canEdit ? (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => onEdit(period)}
                  aria-label={`Edit ${period.label}`}
                  title={`${period.label}, ${formatClock(period.start_time)} to ${formatClock(period.end_time)}`}
                  className={cn(
                    "group min-w-12 overflow-hidden border-r px-2 text-center last:border-r-0",
                    "transition-[filter,transform] hover:brightness-[0.97] active:scale-[0.98]",
                    "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                    style.block,
                  )}
                  style={{ flexGrow: duration, flexBasis: 0 }}
                >
                  {content}
                </button>
              ) : (
                <div
                  key={period.id}
                  title={`${period.label}, ${formatClock(period.start_time)} to ${formatClock(period.end_time)}`}
                  className={cn(
                    "grid min-w-12 place-content-center overflow-hidden border-r px-2 text-center last:border-r-0",
                    style.block,
                  )}
                  style={{ flexGrow: duration, flexBasis: 0 }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-05">
          <span>
            <strong className="font-mont font-semibold text-black-01">{lessons}</strong>{" "}
            teaching period{lessons === 1 ? "" : "s"}
          </span>
          {periods.length > 0 && (
            <span>
              {formatClock(periods[0].start_time)} to{" "}
              {formatClock(periods[periods.length - 1].end_time)}
            </span>
          )}
          <span>{periods.length} total periods</span>
        </div>
      </div>
    </Panel>
  );
}

/**
 * The editable source rows behind the visual school-day preview. On phones the
 * same facts become cards, while desktop keeps the comparison-friendly table.
 */
export function PeriodDirectory({
  periods,
  note,
  multiBranch,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  periods: Period[];
  note: string;
  multiBranch: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (period: Period) => void;
  onDelete: (period: Period) => void;
}) {
  return (
    <Panel as="section" className="overflow-hidden">
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <h2 className="font-mont text-sm font-semibold text-black-01">Schedule periods</h2>
        <p className="mt-1 text-xs text-gray-05 text-pretty">{note}</p>
      </div>

      <div className="divide-y divide-border md:hidden">
        {periods.map((period) => (
          <PeriodCard
            key={period.id}
            period={period}
            multiBranch={multiBranch}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={() => onEdit(period)}
            onDelete={() => onDelete(period)}
          />
        ))}
      </div>

      <div className="max-md:hidden">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="bg-white-05 text-left">
                <PeriodHead className="w-16">Order</PeriodHead>
                <PeriodHead>Period</PeriodHead>
                <PeriodHead>Time</PeriodHead>
                <PeriodHead>Type</PeriodHead>
                <PeriodHead>Applies on</PeriodHead>
                {multiBranch && <PeriodHead>Scope</PeriodHead>}
                <PeriodHead className="w-16 text-center">Action</PeriodHead>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <PeriodRow
                  key={period.id}
                  period={period}
                  multiBranch={multiBranch}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => onEdit(period)}
                  onDelete={() => onDelete(period)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

function PeriodRow({
  period,
  multiBranch,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  period: Period;
  multiBranch: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      aria-label={canEdit ? `Edit ${period.label}` : undefined}
      onClick={canEdit ? onEdit : undefined}
      onKeyDown={
        canEdit
          ? (event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEdit();
              }
            }
          : undefined
      }
      className={cn(
        "border-t border-border transition-colors first:border-t-0",
        canEdit &&
          "cursor-pointer hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
      )}
    >
      <PeriodCell className="text-gray-05">{period.order_index}</PeriodCell>
      <PeriodCell className="font-mont font-semibold text-black-01">
        {period.label}
      </PeriodCell>
      <PeriodCell>
        {formatClock(period.start_time)} - {formatClock(period.end_time)}
      </PeriodCell>
      <PeriodCell>
        <TypeBadge period={period} />
      </PeriodCell>
      <PeriodCell>{period.day_label}</PeriodCell>
      {multiBranch && (
        <PeriodCell>{period.branch ? period.scope_label : "School-wide"}</PeriodCell>
      )}
      <PeriodCell className="text-center">
        <CardActions>
          <PeriodActions
            period={period}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </CardActions>
      </PeriodCell>
    </tr>
  );
}

function PeriodCard({
  period,
  multiBranch,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  period: Period;
  multiBranch: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const content = (
    <div className="flex min-w-0 items-start gap-3">
      <span className="grid size-9 shrink-0 place-content-center rounded-lg bg-pry-01 font-mont text-xs font-semibold text-primary">
        {period.order_index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="font-mont text-sm font-semibold text-black-01">
            {period.label}
          </h3>
          <TypeBadge period={period} />
        </div>
        <p className="mt-1 text-sm text-gray-06">
          {formatClock(period.start_time)} - {formatClock(period.end_time)}
        </p>
        <p className="mt-2 text-xs text-gray-05">
          {period.day_label}
          {multiBranch && ` · ${period.branch ? period.scope_label : "School-wide"}`}
        </p>
      </div>
      <CardActions className="shrink-0">
        <PeriodActions
          period={period}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </CardActions>
    </div>
  );

  return canEdit ? (
    <ClickableCard
      label={`Edit ${period.label}`}
      onOpen={onEdit}
      className="rounded-none border-0 px-4 py-4 shadow-none"
    >
      {content}
    </ClickableCard>
  ) : (
    <div className="px-4 py-4">{content}</div>
  );
}

function PeriodActions({
  period,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  period: Period;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <RowActions
      label={`Actions for ${period.label}`}
      actions={[
        canEdit && { label: "Edit", icon: Pencil, onSelect: onEdit },
        canDelete && {
          label: "Delete",
          icon: Trash2,
          destructive: true,
          onSelect: onDelete,
        },
      ]}
    />
  );
}

function TypeBadge({ period }: { period: Period }) {
  const style = TYPE_STYLE[period.period_type];
  const Icon = style.icon;
  return (
    <Badge variant={style.badge} className="rounded-full py-0 text-[10px]">
      <Icon className="size-3" /> {period.type_label}
    </Badge>
  );
}

function PeriodHead({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-3 font-mont text-xs font-semibold text-gray-06",
        className,
      )}
    >
      {children}
    </th>
  );
}

function PeriodCell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <td className={cn("px-4 py-3 text-[13px] text-gray-06", className)}>
      {children}
    </td>
  );
}
