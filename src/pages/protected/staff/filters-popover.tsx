import { Check, SlidersHorizontal } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type {
  AccountStatus,
  EmploymentStatus,
  StaffRoleOption,
} from "@/redux/services/staff/staff-types";

export interface StaffFilters {
  role: string;
  employment: EmploymentStatus | "all";
  account: AccountStatus | "all";
  /** People with no single base, who belong to the school rather than a site. */
  schoolWideOnly: boolean;
}

/**
 * Role, the two statuses, and the school-wide flag, behind one button.
 *
 * **Employment and account are two controls and never one.** They answer
 * different questions and the panel says so under the second: a single control
 * would tell a school its locked-out teacher had been suspended. This is the
 * one place in the module where the distinction is a piece of interface rather
 * than a chip, so it is spelled out here rather than assumed.
 *
 * **"School-wide only" is not a branch.** The branch pill in the header is what
 * narrows to a site; this asks the opposite question - who has no site at all -
 * which no branch id can express. The server reads it as `branch=school`, the
 * same shape the student directory uses for a child with no class.
 *
 * The count on the button is what makes folding these away safe. Without it a
 * reader lands on a filtered directory with no way to tell, and reads a
 * narrowed list as the whole school.
 */
export function FiltersPopover({
  open,
  onOpenChange,
  value,
  onChange,
  onClear,
  roles,
  employmentStatuses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: StaffFilters;
  onChange: (next: Partial<StaffFilters>) => void;
  onClear: () => void;
  /** The roles THIS school has, shipped with the list rather than hard-coded. */
  roles: StaffRoleOption[];
  /** Only the statuses somebody is actually in, so the list has no dead options. */
  employmentStatuses: { value: EmploymentStatus; label: string }[];
}) {
  const facets =
    (value.role !== "all" ? 1 : 0) +
    (value.employment !== "all" ? 1 : 0) +
    (value.account !== "all" ? 1 : 0) +
    (value.schoolWideOnly ? 1 : 0);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10.5 items-center gap-2 rounded-lg border px-3.5 text-[13.5px] font-medium",
            facets > 0 || open
              ? "border-primary bg-white-03 text-primary"
              : "border-white-02 bg-white text-gray-01 hover:bg-gray-03",
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {facets > 0 && (
            <span className="grid size-4.5 place-content-center rounded-full bg-primary text-[11px] font-semibold text-white">
              {facets}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-79 p-4.5">
        <div className="flex flex-col gap-4">
          <Facet label="Role">
            <NativeSelect
              aria-label="Role"
              value={value.role}
              onChange={(e) => onChange({ role: e.target.value })}
              className="h-10.5"
            >
              <option value="all">Any role</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </NativeSelect>
          </Facet>

          <Facet label="Employment status">
            <NativeSelect
              aria-label="Employment status"
              value={value.employment}
              onChange={(e) =>
                onChange({
                  employment: e.target.value as EmploymentStatus | "all",
                })
              }
              className="h-10.5"
            >
              <option value="all">Any employment status</option>
              {employmentStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </Facet>

          <Facet label="Account status">
            <NativeSelect
              aria-label="Account status"
              value={value.account}
              onChange={(e) =>
                onChange({ account: e.target.value as AccountStatus | "all" })
              }
              className="h-10.5"
            >
              <option value="all">Any account status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending activation</option>
              <option value="LOCKED">Locked</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DEACTIVATED">Deactivated</option>
            </NativeSelect>
            <p className="text-xs text-gray-05">
              Whether the login works. Separate from whether the person still
              works here.
            </p>
          </Facet>

          <div className="border-t border-white-02 pt-3.5">
            <button
              type="button"
              onClick={() =>
                onChange({ schoolWideOnly: !value.schoolWideOnly })
              }
              className="flex items-start gap-2.5 text-left"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-px grid size-4.75 shrink-0 place-content-center rounded-[5px] border-[1.5px] text-white",
                  value.schoolWideOnly
                    ? "border-primary bg-primary"
                    : "border-gray-02 bg-white",
                )}
              >
                {value.schoolWideOnly && <Check className="size-3" />}
              </span>
              <span>
                <span className="block text-[13.5px] text-black-01">
                  Posted school-wide only
                </span>
                <span className="block text-xs text-gray-05">
                  People with no single base, such as a registrar.
                </span>
              </span>
            </button>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-white-02 pt-3.5">
            <button
              type="button"
              onClick={onClear}
              className="h-9 rounded-lg border border-white-02 px-3.5 text-[13.5px] font-medium text-gray-01 hover:bg-gray-03"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-lg bg-primary px-4 text-[13.5px] font-medium text-white hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Facet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-05">
        {label}
      </span>
      {children}
    </div>
  );
}
