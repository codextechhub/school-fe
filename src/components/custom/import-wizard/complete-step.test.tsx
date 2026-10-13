import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PermissionCode } from "@/permissions";
import type { ImportBatch } from "@/redux/services/dashboard/import-types";

const held = new Set<PermissionCode>();
let jobData: { data: unknown } | undefined;
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: (code: PermissionCode) => held.has(code),
  }),
}));
vi.mock("@/redux/services/dashboard/import-api", () => ({
  useGetImportTemplatesQuery: () => ({}),
  useGetImportTemplateQuery: () => ({}),
  useGetImportJobsQuery: () => ({}),
  useGetImportJobQuery: () => ({ data: jobData }),
  useRollbackImportJobMutation: () => [vi.fn(), { isLoading: false }],
  useDownloadImportTemplateMutation: () => [vi.fn(), { isLoading: false }],
  importDownloadUrls: {},
}));

const { CompleteStep, ReviewIssuesStep } = await import("./wizard-steps");
const { P } = await import("@/permissions");

/**
 * The finished-import screen offers rollback only to a reader the server lets
 * roll back, links to the batch page only for a reader that page admits,
 * promises no time limit the server does not impose, and shows the caller's
 * return label as given.
 */
const partial = { id: 7, status: "import_partial" } as unknown as ImportBatch;

const render = (batch: ImportBatch = partial) =>
  renderToStaticMarkup(
    <CompleteStep
      batch={batch}
      batchId={7}
      jobId={3}
      onNewImport={() => {}}
      onViewDetails={() => {}}
      onReturn={() => {}}
      returnLabel="Back to students"
    />,
  );

describe("CompleteStep", () => {
  beforeEach(() => {
    held.clear();
    jobData = undefined;
  });

  it("offers no rollback, and no advice to use one, without the rollback key", () => {
    const html = render();
    expect(html).not.toContain("Roll back import");
    expect(html).not.toContain("rollback option");
  });

  it("offers rollback with the key, and names no deadline", () => {
    held.add(P.RUN_IMPORT_ROLLBACK);
    const html = render();
    expect(html).toContain("Roll back import");
    expect(html).not.toContain("7 days");
  });

  it("shows the return label once, as the caller wrote it", () => {
    const html = render();
    expect(html).toContain("Back to students");
    expect(html).not.toContain("Back to Back to");
  });

  it("offers rollback on a bank statement to the bank-statement key", () => {
    held.add(P.FIN_IMPORT_BANK);
    const statement = { ...partial, dataset_type: "bank_statements" } as ImportBatch;
    expect(render(statement)).toContain("Roll back import");
  });

  it("does not offer rollback on a students batch to the bank-statement key", () => {
    held.add(P.FIN_IMPORT_BANK);
    const roll = { ...partial, dataset_type: "students" } as ImportBatch;
    expect(render(roll)).not.toContain("Roll back import");
  });

  it("links to the batch page only for a reader it admits", () => {
    expect(render()).not.toContain("View import details");
    held.add(P.VIEW_IMPORT_BATCHES);
    expect(render()).toContain("View import details");
  });
});

/**
 * A refusal from Field Access reads plainly wherever an import reports it.
 *
 * Mrs. Okafor's role may not write a student's blood group. Her roll file has a
 * Blood group column, so the preview names row 3 and that column with the
 * server's sentence, and after a run the failed row carries the same sentence.
 * A household file that sets a field she may not write stops the whole job, and
 * the screen says why in the server's words.
 */
const REFUSAL = "You do not have permission to set Blood group.";

describe("ReviewIssuesStep and a field the user may not write", () => {
  const batch = {
    id: 7,
    total_rows: 5,
    error_count: 1,
    warning_count: 0,
    is_ready_for_import: false,
    validation_summary: null,
    validation_issues: [
      {
        id: 1,
        severity: "error",
        code: "business_rule",
        message: REFUSAL,
        row_number: 3,
        column_name: "Blood group",
        field_name: "blood_group",
        is_resolved: false,
        created_at: "2026-10-12T10:00:00Z",
      },
    ],
  } as unknown as ImportBatch;

  it("shows the refusal under its row, beside its column, as the server worded it", () => {
    const html = renderToStaticMarkup(
      <ReviewIssuesStep batch={batch} batchId={7} onBack={() => {}} onNext={() => {}} />,
    );
    expect(html).toContain("Row 3");
    expect(html).toContain(REFUSAL);
    expect(html).toContain("Blood group");
  });
});

describe("CompleteStep and a refused field", () => {
  const failed = { id: 7, status: "import_failed" } as unknown as ImportBatch;
  const job = {
    id: 3,
    status: "failed",
    succeeded_rows: 0,
    failed_rows: 0,
    skipped_rows: 0,
    processed_rows: 0,
    row_results: [],
  };

  it("says why a household job stopped, in the server's words", () => {
    jobData = {
      data: { ...job, last_error_code: "FIELD_WRITE_DENIED", last_error_message: REFUSAL },
    };
    const html = renderToStaticMarkup(
      <CompleteStep batch={failed} batchId={7} jobId={3} onNewImport={() => {}} />,
    );
    expect(html).toContain("Why the import stopped");
    expect(html).toContain(REFUSAL);
    expect(html).toContain("ask someone who may change it");
    expect(html).not.toContain("contact support");
  });

  it("keeps the support advice for a failure that is not a refusal", () => {
    jobData = { data: { ...job, last_error_code: "GUARDIANS_IMPORT_FAILED", last_error_message: "Boom." } };
    const html = renderToStaticMarkup(
      <CompleteStep batch={failed} batchId={7} jobId={3} onNewImport={() => {}} />,
    );
    expect(html).toContain("Boom.");
    expect(html).toContain("contact support");
  });

  it("lists a failed roll row with its message, with or without the details", () => {
    const partialBatch = { id: 7, status: "import_partial" } as unknown as ImportBatch;
    jobData = {
      data: {
        ...job,
        status: "succeeded",
        failed_rows: 2,
        row_results: [
          {
            id: 1, job: 3, row_number: 4, action: "failed", status_message: REFUSAL,
            error_details: { field_write_denied: ["blood_group"] },
          },
          { id: 2, job: 3, row_number: 5, action: "failed", status_message: REFUSAL },
        ],
      },
    };
    const html = renderToStaticMarkup(
      <CompleteStep batch={partialBatch} batchId={7} jobId={3} onNewImport={() => {}} />,
    );
    expect(html).toContain("Row 4");
    expect(html).toContain("Row 5");
    expect(html.split(REFUSAL).length - 1).toBe(2);
  });
});
