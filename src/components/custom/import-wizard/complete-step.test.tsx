import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PermissionCode } from "@/permissions";
import type { ImportBatch } from "@/redux/services/dashboard/import-types";

const held = new Set<PermissionCode>();
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: (code: PermissionCode) => held.has(code),
  }),
}));
vi.mock("@/redux/services/dashboard/import-api", () => ({
  useGetImportTemplatesQuery: () => ({}),
  useGetImportTemplateQuery: () => ({}),
  useGetImportJobsQuery: () => ({}),
  useGetImportJobQuery: () => ({ data: undefined }),
  useRollbackImportJobMutation: () => [vi.fn(), { isLoading: false }],
  useDownloadImportTemplateMutation: () => [vi.fn(), { isLoading: false }],
  importDownloadUrls: {},
}));

const { CompleteStep } = await import("./wizard-steps");
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
  beforeEach(() => held.clear());

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
