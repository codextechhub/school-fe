import type { Register, RegisterCounts, RegisterStatus } from "@/redux/services/attendance/attendance-types";

export type RegisterDirectoryFilter = "all" | "action" | "submitted";

export interface RegisterDirectorySummary {
  submitted: number;
  inProgress: number;
  notStarted: number;
}

export function registerNeedsAction(status?: RegisterStatus) {
  return status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "READY";
}

export function registerMatchesFilter(register: Register | undefined, filter: RegisterDirectoryFilter) {
  if (filter === "all") return true;
  if (!register || register.closed || register.roster_empty) return false;
  if (filter === "submitted") return register.status === "SUBMITTED";
  return registerNeedsAction(register.status);
}

export function summarizeRegisters(registers: Array<Register | undefined>): RegisterDirectorySummary {
  return registers.reduce<RegisterDirectorySummary>((summary, register) => {
    if (!register || register.closed || register.roster_empty) return summary;
    if (register.status === "SUBMITTED") summary.submitted += 1;
    else if (register.status === "IN_PROGRESS" || register.status === "READY") summary.inProgress += 1;
    else if (register.status === "NOT_STARTED") summary.notStarted += 1;
    return summary;
  }, { submitted: 0, inProgress: 0, notStarted: 0 });
}

export function registerProgress(counts?: RegisterCounts) {
  if (!counts) return null;
  const markable = Math.max(0, counts.total - counts.locked);
  const marked = Math.max(0, markable - counts.unmarked);
  return {
    marked,
    markable,
    percent: markable > 0 ? Math.round((marked / markable) * 100) : 0,
  };
}
