import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import {
  useGetImportBatchesQuery,
  useGetImportIssuesQuery,
  useStartImportMutation,
} from "@/redux/services/import-data/import-api";
import { datasetLabel } from "./onboarding-labels";
import { PageShell } from "@/components/layout/page-shell";

/**
 * "Validation Results" - what is wrong with the file, before anything is saved.
 *
 * Its own screen rather than a panel under the upload, because the design gives
 * it one and the reason holds: the decision here is "fix these rows or proceed
 * with the warnings", and that is not a decision anybody can make from a
 * summary line. It needs the rows in front of them.
 *
 * The counts across the top are the design's four, and the distinction between
 * the middle two is the whole screen: **errors block the import, warnings do
 * not**. A reader who cannot tell them apart either fixes rows they did not
 * need to, or waives ones they should have read.
 */

const ISSUE_COLUMNS = ["Row", "Column", "Value", "Issue"];

export default function OnboardingImportValidation() {
  const navigate = useNavigate();
  const params = useParams();
  const batchId = Number(params.batchId);

  const [errorsOnly, setErrorsOnly] = useState(true);
  const [commit, commitState] = useStartImportMutation();

  const batches = useGetImportBatchesQuery();
  const issues = useGetImportIssuesQuery(batchId, { skip: !batchId });

  const batch = (batches.data ?? []).find((b) => b.id === batchId);
  // Memoised for the reason import.tsx memoises `offered`: the fallback
  // allocates a new array every render, so the memos below it never hit.
  const rows = useMemo(() => issues.data ?? [], [issues.data]);

  const counts = useMemo(() => {
    const errors = rows.filter((i) => i.severity === "error").length;
    const warnings = rows.filter((i) => i.severity === "warning").length;
    const read = batch?.total_rows ?? 0;
    // Rows carrying an error, not issues: one row can fail three columns and is
    // still one row the school has to go and fix.
    const badRows = new Set(
      rows.filter((i) => i.severity === "error" && i.row != null).map((i) => i.row),
    ).size;
    return { errors, warnings, read, clean: Math.max(read - badRows, 0) };
  }, [rows, batch]);

  const visible = useMemo(
    () => (errorsOnly ? rows.filter((i) => i.severity === "error") : rows),
    [rows, errorsOnly],
  );

  const blocked = counts.errors > 0;

  async function onProceed() {
    try {
      await commit(batchId).unwrap();
      toast.success("Your file is being imported.");
      navigate(routesPath.PROTECTED.ONBOARDING.IMPORT);
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(apiErrorMessage(parsed, "We could not start that import."));
    }
  }

  const issueRows = useMemo(
    () =>
      visible.map((issue, index) => ({
        Row: (
          <span className="font-mono text-xs text-gray-05">
            {issue.row == null ? "File" : issue.row}
          </span>
        ),
        Column: issue.column || "-",
        Value: (
          <span className="font-mono text-xs text-black-01 break-all">
            {issue.value || "-"}
          </span>
        ),
        Issue: <span className="text-pretty">{issue.message}</span>,
        _key: issue.id ?? index,
      })),
    [visible],
  );

  if (batches.isLoading || issues.isLoading) {
    return (
      <PageShell className="gap-4" grid>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell className="gap-5" grid>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-black-01 font-mont text-balance">
            Validation Results
            {batch ? ` - ${datasetLabel(batch.dataset_type)}` : ""}
          </h1>
          <p className="mt-1 text-sm text-gray-01 truncate">
            {batch?.original_filename ?? "This file"}
            {batch?.created_at
              ? ` · uploaded ${new Date(batch.created_at).toLocaleString()}`
              : ""}
          </p>
        </div>
        <a
          href={`/api/v1/import/batches/${batchId}/issues/export/`}
          className="shrink-0"
        >
          <Button variant="outline" className="h-9">
            <Download className="size-4" />
            Download error report
          </Button>
        </a>
      </div>

      {/* The four counts. Errors and warnings are separated on purpose. */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile value={counts.read} label="Rows read" />
        <Tile value={counts.errors} label="Errors - block import" tone="danger" />
        <Tile value={counts.warnings} label="Warnings - importable" tone="warning" />
        <Tile value={counts.clean} label="Clean rows" tone="success" />
      </section>

      {/* Same wrapper as every other table in the app: white card, the same
          insets, the table inside its own scroll container. */}
      <section className="bg-white rounded-md px-3 py-4 sm:px-5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-black-01 font-mont">
            Rows needing attention
          </p>
          <label className="flex items-center gap-2 text-[13px] text-gray-01 cursor-pointer">
            <Checkbox
              checked={errorsOnly}
              onCheckedChange={(checked) => setErrorsOnly(checked === true)}
            />
            Show errors only
          </label>
        </div>

        <div className="mt-3 overflow-x-auto">
          <CustomTable
            tableHeaderList={ISSUE_COLUMNS}
            tableBodyList={issueRows}
            emptyText={
              errorsOnly && rows.length > 0
                ? "No errors. Untick to see the warnings."
                : "Nothing is wrong with this file."
            }
            hidePagination
          />
        </div>
      </section>

      <section className="bg-white rounded-md px-3 py-4 sm:px-5 flex flex-wrap items-center gap-3">
        <PermissionGate permission={P.EXECUTE_IMPORT_BATCH}>
          <Button
            className="h-10"
            disabled={blocked || commitState.isLoading}
            onClick={() => void onProceed()}
          >
            {counts.warnings > 0 ? "Proceed with warnings" : "Import this file"}
          </Button>
        </PermissionGate>
        <span className="text-[13px] text-gray-05 text-pretty">
          {blocked
            ? `${counts.errors} ${counts.errors === 1 ? "error" : "errors"} must clear before import. Warnings can be waived.`
            : "Nothing has been saved yet. Import it when you are ready."}
        </span>
      </section>
    </PageShell>
  );
}

/** One count. The tone carries whether it is a problem, not just the number. */
function Tile({
  value,
  label,
  tone = "plain",
}: {
  value: number;
  label: string;
  tone?: "plain" | "danger" | "warning" | "success";
}) {
  const colour = {
    plain: "text-black-01",
    danger: "text-red-01",
    warning: "text-yellow-01",
    success: "text-green-01",
  }[tone];
  return (
    <div className="bg-white rounded-md px-4 py-3.5 min-w-0">
      <p className={`text-xl font-semibold font-mont tabular-nums ${colour}`}>
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-05 text-pretty">{label}</p>
    </div>
  );
}
