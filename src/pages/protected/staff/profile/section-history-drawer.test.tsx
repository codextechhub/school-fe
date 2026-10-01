import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  result: {} as Record<string, unknown>,
}));

vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetStaffSectionHistoryQuery: () => state.result,
}));
vi.mock("@/hooks/use-school-display", () => ({
  useSchoolDisplay: () => ({ prefs: {} }),
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { SectionHistoryDrawer } from "./section-history-drawer";

/** The history request can be pending or malformed while its drawer is open. */
function renderHistory() {
  return renderToStaticMarkup(<SectionHistoryDrawer
    staffId={74} personName="Adaeze Okafor" section="qualifications" onClose={() => undefined}
  />);
}

describe("SectionHistoryDrawer", () => {
  it("keeps the drawer open while the first page has no response", () => {
    state.result = { currentData: undefined, isFetching: true, isError: false, isSuccess: false };
    const html = renderHistory();
    expect(html).toContain("Loading history");
    expect(html).toContain("Qualifications history");
  });

  it("shows a retry when a successful response has no history page", () => {
    state.result = {
      currentData: { data: undefined }, isFetching: false, isError: false,
      isSuccess: true, refetch: vi.fn(),
    };
    expect(renderHistory()).toContain("We could not load this history");
  });

  it("shows an empty section without offering another page", () => {
    state.result = {
      currentData: { data: { entries: [], next_page: null } },
      isFetching: false, isError: false, isSuccess: true,
    };
    const html = renderHistory();
    expect(html).toContain("No changes recorded for this section");
    expect(html).toMatch(/disabled=""[^>]*>Older<\/button>/);
  });
});
