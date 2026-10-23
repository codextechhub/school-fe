import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import type { StaffLeave, StaffLeaveRequest } from "@/redux/services/staff/staff-types";

let fieldAccess: FieldAccessMap = {};

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/redux/services/staff/staff-api", () => ({}));
vi.mock("@/components/custom/field-access-overrides", () => ({ default: () => null }));

import { LeaveTab } from "./tab-panels";

/**
 * The Leave tab reading Mrs Okafor's balances at Lagoon View.
 *
 * Lagoon View allows 20 days of annual leave and 10 of sick leave a session,
 * and sets no limit on the rest. She has taken 18 annual days and asked for 4
 * more, so she is 2 past the allowance while the request waits; she has taken
 * 3 days of compassionate leave, which has no limit; and nothing else.
 */
const OKAFOR: StaffLeave = {
  leave: [
    {
      id: 7, staff_id: 12, staff_name: "Adaeze Okafor", leave_type: "ANNUAL",
      leave_type_label: "Annual", start_date: "2026-10-05", end_date: "2026-10-08",
      resumption_date: "2026-10-09", resumption_is_estimate: false,
      days: 4, over_allowance_by: 2, note: "", status: "PENDING", display_status: "PENDING",
      decided_at: null, requested_by: null, created_at: "2026-09-28T10:00:00Z",
    },
  ],
  leave_group: { id: "bc8b0cce-383f-48e1-8cb9-1187a35c5d09", name: "Senior staff" },
  days_taken: [{ leave_type: "ANNUAL", days: 18 }, { leave_type: "COMPASSIONATE", days: 3 }],
  balances: [
    { leave_type: "ANNUAL", label: "Annual", allowance: 20, taken: 18, pending: 4, remaining: -2 },
    { leave_type: "SICK", label: "Sick", allowance: 10, taken: 0, pending: 0, remaining: 10 },
    { leave_type: "MATERNITY", label: "Maternity", allowance: null, taken: 0, pending: 0, remaining: null },
    { leave_type: "COMPASSIONATE", label: "Compassionate", allowance: null, taken: 3, pending: 0, remaining: null },
  ],
  balance_session: { id: 15, name: "2026/2027", start_date: "2026-08-17", end_date: "2027-07-16" },
  balance_note: "Allowances are per academic session.",
};

describe("LeaveTab", () => {
  beforeEach(() => {
    fieldAccess = {};
  });

  const text = () =>
    new DOMParser().parseFromString(renderToStaticMarkup(<LeaveTab leave={OKAFOR} />), "text/html")
      .body.textContent ?? "";

  it("shows each limited type's standing for the session, and days over as days over", () => {
    expect(text()).toContain("Leave balance, 2026/2027");
    expect(text()).toContain("2 days over");
    expect(text()).toContain("20 days allowed · 18 taken · 4 pending");
    expect(text()).toContain("10 days left");
  });

  it("says No limit for a type with no allowance, and leaves out one never used", () => {
    expect(text()).toContain("No limit");
    expect(text()).toContain("3 taken");
    expect(text()).not.toContain("Maternity");
  });

  it("marks a request that went past the allowance", () => {
    expect(text()).toContain("2 days over allowance");
    expect(text()).toContain("Resumption date");
    expect(text()).toContain("9 Oct 2026");
    expect(text()).toContain("Senior staff");
  });

  it("opens each request to show its approver, day count and available actions", () => {
    const request = OKAFOR.leave[0];
    const markup = renderToStaticMarkup(<LeaveTab
      leave={{ ...OKAFOR, leave: [{ ...request, approval: { instance_id: "abc", stage: "Leave approval", pending_with: ["Ngozi Eze"] } }] }}
      onEdit={() => undefined}
      onCancel={() => undefined}
    />);
    expect(markup).toContain("<details");
    expect(markup).toContain("Pending with");
    expect(markup).toContain("Ngozi Eze");
    expect(markup).toContain("4 days");
    expect(markup).toContain("Edit request");
    expect(markup).toContain("Cancel request");
  });

  it("falls back to days taken where there is no session to count against", () => {
    const markup = renderToStaticMarkup(
      <LeaveTab leave={{ ...OKAFOR, balances: [], balance_session: null }} />,
    );
    expect(markup).toContain("Days taken");
    expect(markup).not.toContain("Leave balance");
  });
  it("leaves out the balances, the totals and the days-over chip the server did not send", () => {
    const { balances: _b, days_taken: _d, balance_session: _s, balance_note: _n, ...bare } = OKAFOR;
    const { over_allowance_by: _o, ...request } = OKAFOR.leave[0];
    const markup = renderToStaticMarkup(
      <LeaveTab leave={{ ...(bare as StaffLeave), leave: [request as StaffLeaveRequest] }} />,
    );
    expect(markup).not.toContain("Leave balance");
    expect(markup).not.toContain("Days taken");
    expect(markup).not.toContain("over allowance");
    expect(markup).toContain("Annual");
  });

  it("treats an absent balances key as nothing to show, never as zero", () => {
    const { balances: _b, days_taken: _d, ...bare } = OKAFOR;
    const markup = renderToStaticMarkup(<LeaveTab leave={bare as StaffLeave} />);
    expect(markup).not.toContain("Leave balance");
    expect(markup).not.toContain("None taken");
    expect(markup).toContain("Annual");
  });

  it("removes the dates, days, status and note lines the server did not send", () => {
    const {
      start_date: _s, end_date: _e, resumption_date: _r, resumption_is_estimate: _re, days: _d,
      status: _st, display_status: _ds, note: _n, approval: _a, ...bare
    } = { ...OKAFOR.leave[0], note: "Family event", approval: { instance_id: null, stage: null, pending_with: [] } };
    const markup = renderToStaticMarkup(<LeaveTab leave={{ ...OKAFOR, leave: [bare as StaffLeaveRequest] }} />);
    expect(markup).not.toContain("Oct 2026");
    expect(markup).not.toContain("Resumption date");
    expect(markup).not.toContain("4 days");
    expect(markup).not.toContain("Pending</span>");
    expect(markup).not.toContain("Pending with");
    expect(markup).not.toContain("Family event");
    expect(markup).toContain("Annual");
  });

  it("draws a request's own details in full even when the map hides them, because the server sent them", () => {
    fieldAccess = { "school.leave": { hidden: ["days", "status", "note"] } };
    const markup = renderToStaticMarkup(<LeaveTab leave={{ ...OKAFOR, leave: [{ ...OKAFOR.leave[0], note: "Family event" }] }} />);
    expect(markup).toContain("4 days");
    expect(markup).toContain("Family event");
  });

  it("copes with the session and the note being absent while the balances are present", () => {
    const { balance_session: _s, balance_note: _n, ...bare } = OKAFOR;
    const markup = renderToStaticMarkup(<LeaveTab leave={bare as StaffLeave} />);
    expect(markup).toContain("Days taken");
    expect(markup).not.toContain("undefined");
  });

  it("copes with an approval block that has no approver list", () => {
    const request = { ...OKAFOR.leave[0], approval: { instance_id: "abc", stage: "Leave approval" } };
    const markup = renderToStaticMarkup(
      <LeaveTab leave={{ ...OKAFOR, leave: [request as unknown as StaffLeaveRequest] }} />,
    );
    expect(markup).toContain("No approver assigned yet");
  });
});
