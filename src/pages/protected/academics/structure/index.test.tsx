import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { AcademicOverview } from "@/redux/services/academics/academics-types";
import { AcademicStructureOverviewContent } from "./index";

vi.mock("@/hooks/use-school-words", async () => {
  const { resolveSchoolWords } = await import("@/lib/school-words");
  return { useSchoolWords: () => resolveSchoolWords({}) };
});

const completeOverview: AcademicOverview = {
  active_session: {
    id: 1,
    name: "2026/2027",
    status: "ACTIVE",
    start_date: "2026-09-01",
    end_date: "2027-07-30",
    percent_elapsed: 15,
    current_term: "First Term",
    next_term: null,
    terms: [],
  },
  viewed_session: null,
  counts: {
    sessions: 1,
    departments: 1,
    programs: 1,
    levels: 1,
    classes: 1,
    subjects: 1,
  },
  branches_without_a_session: [],
};

function renderOverview(overview: AcademicOverview): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AcademicStructureOverviewContent
        overview={overview}
        multiBranch={false}
        branch="all"
      />
    </MemoryRouter>,
  );
}

describe("academic structure overview order", () => {
  it("puts incomplete readiness before the structure", () => {
    const html = renderOverview({
      ...completeOverview,
      counts: { ...completeOverview.counts, subjects: 0 },
    });

    expect(html.indexOf("Structure readiness")).toBeLessThan(
      html.indexOf("The structure"),
    );
  });

  it("keeps completed readiness after the structure", () => {
    const html = renderOverview(completeOverview);

    expect(html.indexOf("Structure readiness")).toBeGreaterThan(
      html.indexOf("The structure"),
    );
  });
});
