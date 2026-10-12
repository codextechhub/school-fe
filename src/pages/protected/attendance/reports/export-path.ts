import type { ReportFileType, ReportTable } from "@/redux/services/attendance/attendance-types";

/**
 * The address one table of the attendance report downloads from.
 *
 * The same term and branch as the screen, so the file and the table it was
 * taken from cannot disagree. The file type travels as `export`, not
 * `format`, which the API framework keeps for itself. "all" branches is left
 * out, as it is on every other attendance read.
 */
export function reportExportPath(
  table: ReportTable,
  fileType: ReportFileType,
  { term, branch }: { term?: number; branch?: number | "all" },
): string {
  const params = new URLSearchParams({ table, export: fileType });
  if (term) params.set("term", String(term));
  if (branch !== undefined && branch !== "all") params.set("branch", String(branch));
  return `/v1/attendance/reports/export/?${params.toString()}`;
}

const TABLE_FILE: Record<ReportTable, string> = {
  by_class: "attendance-by-class",
  chronic: "chronic-absence",
  not_taken: "registers-not-taken",
};

/** The name a downloaded file is saved under on the reader's device. */
export function reportFileName(table: ReportTable, fileType: ReportFileType, termLabel: string): string {
  const slug = termLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${TABLE_FILE[table]}${slug ? `-${slug}` : ""}.${fileType}`;
}
