import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  batches: [] as Record<string, unknown>[],
  transition: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("@/components/custom/permission-gate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/custom/bulk-import-drawer", () => ({ default: () => null }));

vi.mock("@/hooks/use-school-display", () => ({
  useSchoolDisplay: () => ({ formatDateTime: (value: string) => value }),
}));

vi.mock("@/redux/services/dashboard/import-api", () => ({
  importDownloadUrls: () => ({}),
  useGetImportTemplatesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetImportBatchesQuery: () => ({ data: { data: mocks.batches }, isLoading: false }),
}));

vi.mock("@/redux/services/onboarding/onboarding-api", () => ({
  useTransitionOnboardingTaskMutation: () => [mocks.transition, { isLoading: false }],
}));

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

import ImportInitialData from "./import";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const batch = (dataset_type: string, status: string) => ({
  id: `${dataset_type}-${status}`, dataset_type, status, file_name: `${dataset_type}.xlsx`,
  total_rows: 10, created_at: "2026-10-29T09:00:00Z",
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mocks.batches = [];
  mocks.transition.mockReset();
  mocks.toastError.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = () => act(() => root.render(
  <MemoryRouter>
    <ImportInitialData />
  </MemoryRouter>,
));

const finish = () =>
  Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Finish data setup")!;

describe("upload initial datasets: finishing the step", () => {
  it("can finish once one file has imported in full, as the backend allows", () => {
    mocks.batches = [batch("students", "import_succeeded")];
    render();

    expect(finish().disabled).toBe(false);
    expect(container.textContent).toContain("1 of 3 fully imported");
  });

  it("cannot finish on a partly imported file", () => {
    mocks.batches = [batch("students", "import_partial")];
    render();

    expect(finish().disabled).toBe(true);
    expect(container.textContent).toContain("A partly imported file does not count.");
  });

  it("calls the three datasets recommended, not required", () => {
    render();

    expect(container.textContent).toContain("Recommended datasets");
    expect(container.textContent).not.toContain("Required datasets");
  });

  it("shows the server's reason when the step is refused", async () => {
    mocks.batches = [batch("students", "import_succeeded")];
    mocks.transition.mockReturnValue({
      unwrap: () => Promise.reject({
        status: 422,
        data: {
          success: false,
          message: "No data import has completed in full for this school yet.",
          error: { code: "TASK_CONDITION_NOT_MET", detail: {} },
        },
      }),
    });
    render();

    await act(async () => {
      finish().click();
      for (let i = 0; i < 8; i++) await Promise.resolve();
    });

    expect(mocks.toastError).toHaveBeenCalledWith(
      "No data import has completed in full for this school yet.",
    );
  });
});
