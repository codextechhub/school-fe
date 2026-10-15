import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Release, ReportCard, StudentResults } from "@/redux/services/gradebook/gradebook-types";

/**
 * The release list, the report card and the Results tab draw what the server
 * sends and nothing else.
 *
 * Lagoon View published JSS1 A. Temitope Adegoke was released; Zainab Afolabi
 * is held. Field Access is enforced by the server, which leaves a field out
 * of the payload; these screens must then drop the column, line or block
 * rather than print a blank or a zero under its heading.
 */
vi.mock("@/hooks/use-branch-lens", () => ({ useBranchLens: () => ({ branch: "all", applies: false, label: "" }) }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const release: Release = {
  class: { id: 82, name: "JSS1 A" },
  term: { id: 44, name: "First Term" },
  stage: "PUBLISHED",
  published_at: "2026-10-14T17:22:27Z",
  class_size: 2,
  held_count: 1,
  rows: [
    {
      student: { id: 528, name: "Temitope Adegoke", admission_number: "" },
      guardian: { name: "Mrs. B. Adegoke", email: null },
      result_state: "RELEASED",
      email_state: "NO_EMAIL",
      emailed_at: null,
      released_at: "2026-10-14T17:22:27Z",
    },
    {
      student: { id: 373, name: "Zainab Afolabi", admission_number: "" },
      guardian: { name: "Mr. Z. Afolabi", email: "afolabi.household@example.ng" },
      result_state: "HELD",
      email_state: "HELD",
      emailed_at: null,
      released_at: null,
    },
  ],
};
let releaseData: Release = release;

const card: ReportCard = {
  letterhead: { school_name: "Lagoon View Academy", logo_url: null, branch_name: "Main Branch", branch_address: null, phone: null },
  term_line: "Report card · First Term, 2026/2027",
  facts: [{ label: "Student", value: "Temitope Adegoke" }],
  components: [{ short_name: "CA1", max_score: 20 }, { short_name: "EXAM", max_score: 80 }],
  subjects: [
    { name: "Mathematics", cells: ["8", "45"], total: 53, grade: "C", remark: "Good", class_average: "60.8", highest: 87, lowest: 29 },
  ],
  totals: [{ label: "Overall average", value: "46.50%" }, { label: "Position in class", value: "24th of 27" }],
  attendance: [{ label: "Times school opened", value: "32" }],
  ratings: [{ trait: "Punctuality", value: 5 }],
  rating_key: "1 poor · 5 excellent",
  teacher_comment: "A cheerful team player.",
  teacher_name: "Kunle Adebayo, class teacher",
  principal_comment: "A fair result.",
  principal_name: "Emeka Obi",
  grading_key: "A 70+ · F 0+",
  next_term_line: "Next term begins Sun 6 Dec 2026",
  version: 1,
  held: false,
};

const results: StudentResults = {
  student: { id: 373, name: "Zainab Afolabi", admission_number: "", class: { id: 82, name: "JSS1 A" }, branch: null },
  terms: [
    {
      term: { id: 44, name: "First Term" },
      session: { id: 15, name: "2026/2027" },
      published: true,
      overall_average: "77.00",
      position: "1st of 27",
      released_at: null,
      release_label: "Held",
      version: 1,
      subjects: [{ name: "Mathematics", total: 78, grade: "A", remark: "Excellent" }],
      class_id: 82,
    },
    { term: { id: 43, name: "Third Term" }, session: { id: 14, name: "2025/2026" }, published: false, message: "Nothing was published for this term." },
  ],
  history: [
    { kind: "HOLD_PLACED", text: "Result held for First Term", reason: "Two terms unpaid.", by: "Ngozi Ibekwe", at: "2026-10-14T17:22:27Z" },
  ],
};
let resultsData: StudentResults = results;

vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetReleaseClassesQuery: () => ({
    data: { data: { term: { id: 44, name: "First Term" }, branch_dimension: false, classes: [{ class: { id: 82, name: "JSS1 A" }, branch: null, stage: "PUBLISHED", published_at: null }] } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetReleaseQuery: () => ({ data: { data: releaseData }, isLoading: false, isError: false, refetch: vi.fn() }),
  useGetStudentResultsQuery: () => ({ data: { data: resultsData }, isLoading: false, isError: false, refetch: vi.fn() }),
}));

import ReleasePage from "../release";
import { StudentResultsTab } from "../student-tab";
import { ReportCardSheet } from "./report-card";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  releaseData = release;
  resultsData = results;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Distinct links: the table draws each row twice, once as a phone card. */
const cardLinks = () =>
  new Set(Array.from(container.querySelectorAll('a[href^="/gradebook/report-cards/"]')).map((a) => a.getAttribute("href")));
const headers = () => Array.from(container.querySelectorAll("th")).map((th) => th.textContent?.trim());
const render = (node: ReactNode) => act(() => root.render(<MemoryRouter>{node}</MemoryRouter>));

describe("release list", () => {
  it("shows each guardian, result and email state, previews released and held cards, and prints the class", () => {
    render(<ReleasePage />);
    expect(headers()).toEqual(["Student", "Primary guardian", "Result", "Email", "Report card"]);
    expect(container.textContent).toContain("No email on file");
    expect(container.textContent).toContain("Held, nothing sent");
    expect(container.textContent).toContain("1 held, not included");
    expect(cardLinks()).toEqual(
      new Set(["/gradebook/report-cards/82", "/gradebook/report-cards/82/528", "/gradebook/report-cards/82/373"]),
    );
  });

  it("drops the guardian and email columns when the server leaves them out", () => {
    releaseData = {
      ...release,
      rows: release.rows.map(({ guardian: _g, email_state: _e, emailed_at: _a, ...row }) => row),
    };
    render(<ReleasePage />);
    expect(headers()).toEqual(["Student", "Result", "Report card"]);
    expect(container.textContent).not.toContain("Mrs. B. Adegoke");
  });

  it("offers no preview or print before publication", () => {
    releaseData = {
      ...release,
      stage: "AWAITING",
      published_at: null,
      held_count: 0,
      rows: release.rows.map((row) => ({ ...row, result_state: "NOT_PUBLISHED", email_state: null })),
    };
    render(<ReleasePage />);
    expect(container.textContent).toContain("Not published yet, so nothing has been released or sent.");
    expect(cardLinks().size).toBe(0);
  });
});

describe("report card", () => {
  it("prints every block the payload carries", () => {
    render(<ReportCardSheet card={card} />);
    expect(headers()).toEqual(expect.arrayContaining(["CA120", "Total", "Grade", "Class avg", "High", "Low", "Remark"]));
    for (const text of ["24th of 27", "Times school opened", "Conduct and skills", "A cheerful team player.", "A fair result.", "Next term begins"]) {
      expect(container.textContent).toContain(text);
    }
  });

  it("leaves out each column and block the server withheld", () => {
    const {
      attendance: _a, ratings: _r, rating_key: _k, teacher_comment: _t, teacher_name: _n,
      principal_comment: _p, principal_name: _pn, next_term_line: _x, ...rest
    } = card;
    render(
      <ReportCardSheet
        card={{
          ...rest,
          subjects: [{ name: "Mathematics" }],
          totals: [{ label: "Overall average", value: "46.50%" }],
        }}
      />,
    );
    expect(headers()).toEqual(["Subject"]);
    for (const text of ["24th of 27", "Attendance", "Conduct and skills", "Class teacher's comment", "Principal's comment", "Next term"]) {
      expect(container.textContent).not.toContain(text);
    }
  });

  it("says a held card is held, on screen only", () => {
    render(<ReportCardSheet card={{ ...card, held: true }} />);
    const note = container.querySelector('[role="status"]');
    expect(note?.textContent).toContain("not released to the family");
    expect(note?.className).toContain("print-hide");
  });
});

describe("results tab", () => {
  it("shows each published term's figures, a calm line for the rest, and the history", () => {
    render(<StudentResultsTab studentId={373} />);
    expect(container.textContent).toContain("77.00%");
    expect(container.textContent).toContain("1st of 27");
    expect(container.textContent).toContain("Nothing was published for this term.");
    expect(container.textContent).toContain("Two terms unpaid.");
  });

  it("drops the figures and the hold reason the server withheld", () => {
    resultsData = {
      ...results,
      terms: [
        {
          ...results.terms[0],
          overall_average: undefined,
          position: undefined,
          subjects: [{ name: "Mathematics", grade: "A" }],
        },
      ],
      history: [{ kind: "HOLD_PLACED", text: "Result held for First Term", by: "Ngozi Ibekwe", at: "2026-10-14T17:22:27Z" }],
    };
    const { overall_average: _o, position: _p, ...term } = resultsData.terms[0];
    resultsData = { ...resultsData, terms: [term] };
    render(<StudentResultsTab studentId={373} />);
    expect(container.textContent).not.toContain("Overall average");
    expect(container.textContent).not.toContain("Position");
    expect(headers()).toEqual(["Subject", "Grade"]);
    expect(container.textContent).not.toContain("Two terms unpaid.");
    expect(container.textContent).toContain("Result held for First Term");
  });

  it("leaves the history out when there is none", () => {
    resultsData = { ...results, history: [] };
    render(<StudentResultsTab studentId={373} />);
    expect(container.textContent).not.toContain("Nothing here is deleted.");
  });
});
