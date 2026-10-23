import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import type {
  StaffLeave,
  StaffLeavePreview,
  StaffLeavePreviewArg,
  StaffLeaveRequest,
} from "@/redux/services/staff/staff-types";

/**
 * The leave form at Lagoon View, filing for Mrs Okafor.
 *
 * Lagoon View allows 20 days of annual leave a session and counts Monday to
 * Friday. Mrs Okafor has taken 10 annual days and has 2 pending, so 8 are left
 * in 2026/2027. Her sick leave has no limit and she has taken 3 days of it.
 * Choosing a type shows where she stands; choosing the days adds what the
 * request would count as, which only the server can say.
 */
let fieldAccess: FieldAccessMap = {};
let leave: StaffLeave | undefined;
let previewResult: { data?: { data: StaffLeavePreview }; isError?: boolean };
const previewArgs: Array<{ arg: StaffLeavePreviewArg; skip: boolean | undefined }> = [];
const file = vi.fn();
const update = vi.fn();

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useFileStaffLeaveMutation: () => [file, { isLoading: false }],
  useUpdateStaffLeaveMutation: () => [update, { isLoading: false }],
  useGetStaffRulesQuery: () => ({ data: undefined }),
  useGetStaffLeaveQuery: () => ({ currentData: leave ? { data: leave } : undefined }),
  useGetStaffLeavePreviewQuery: (arg: StaffLeavePreviewArg, options?: { skip?: boolean }) => {
    previewArgs.push({ arg, skip: options?.skip });
    return {
      currentData: options?.skip ? undefined : previewResult.data,
      isError: !options?.skip && Boolean(previewResult.isError),
    };
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/components/ui/date-picker-input", () => ({
  DatePickerInput: ({ value, onChange, id }: { value: string; onChange: (e: { target: { value: string } }) => void; id?: string }) => (
    <input id={id} data-day value={value} onChange={onChange as never} />
  ),
}));
vi.mock("../../students/drawers/drawer-shell", async (importActual) => {
  const actual = await importActual<typeof import("../../students/drawers/drawer-shell")>();
  return {
    ...actual,
    DrawerShell: ({
      children,
      saveLabel,
      onSave,
      canSave,
    }: {
      children: ReactNode;
      saveLabel: string;
      onSave: () => void;
      canSave: boolean;
    }) => (
      <div>
        {children}
        <button type="button" disabled={!canSave} onClick={onSave}>{saveLabel}</button>
      </div>
    ),
  };
});

import { toast } from "sonner";

import { LeaveDrawer } from "./leave-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const OKAFOR: StaffLeave = {
  leave: [],
  leave_group: null,
  days_taken: [{ leave_type: "ANNUAL", days: 10 }],
  balances: [
    { leave_type: "ANNUAL", label: "Annual", allowance: 20, taken: 10, pending: 2, remaining: 8 },
    { leave_type: "SICK", label: "Sick", allowance: null, taken: 3, pending: 0, remaining: null },
    { leave_type: "STUDY", label: "Study", allowance: 5, taken: 5, pending: 2, remaining: -2 },
  ],
  balance_session: { id: 15, name: "2026/2027", start_date: "2026-08-17", end_date: "2027-07-16" },
  balance_note: "Allowances are per academic session.",
};

const PREVIEW: StaffLeavePreview = {
  days: 5,
  resumption_date: "2026-11-02",
  leave_type: "ANNUAL",
  allowance: 20,
  taken: 10,
  pending: 2,
  remaining: 8,
  remaining_after: 3,
  over_allowance_by: 0,
  session: { id: 15, name: "2026/2027" },
};

const PENDING: StaffLeaveRequest = {
  id: 7, staff_id: 12, staff_name: "Adaeze Okafor", leave_type: "ANNUAL",
  leave_type_label: "Annual", start_date: "2026-10-26", end_date: "2026-10-30",
  resumption_date: "2026-11-02", resumption_is_estimate: false,
  days: 5, over_allowance_by: 0, note: "Family event", status: "PENDING", display_status: "PENDING",
  decided_at: null, requested_by: null, created_at: "2026-10-01T10:00:00Z",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  fieldAccess = {};
  leave = OKAFOR;
  previewResult = { data: { data: PREVIEW } };
  previewArgs.length = 0;
  file.mockReset();
  update.mockReset();
  file.mockReturnValue({ unwrap: () => Promise.resolve({ data: { warnings: [] } }) });
  update.mockReturnValue({ unwrap: () => Promise.resolve({ data: { warnings: [] } }) });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const render = (request?: StaffLeaveRequest) =>
  act(() =>
    root.render(
      <LeaveDrawer staffId={12} personName="Adaeze Okafor" isSelf={false} request={request} onClose={() => {}} />,
    ),
  );

const box = () => container.querySelector("[aria-label='Leave balance']");
const text = () => box()?.textContent ?? "";

const choose = (value: string) => {
  const select = container.querySelector("select")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
  act(() => {
    setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const pick = (index: number, value: string) => {
  const input = container.querySelectorAll("input[data-day]")[index] as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const settle = () => act(() => void vi.advanceTimersByTime(300));
const saveButton = () => [...container.querySelectorAll("button")].find((b) => /File request|Save changes/.test(b.textContent ?? ""))!;

describe("LeaveDrawer balance box", () => {
  it("is absent until a type is chosen", () => {
    render();
    expect(box()).toBeNull();
  });

  it("shows allowance, taken, pending and remaining for the chosen type", () => {
    render();
    choose("ANNUAL");
    expect(text()).toContain("Annual leave, 2026/2027");
    for (const part of ["Allowance", "20", "Taken", "10", "Pending", "2", "Remaining", "8"]) {
      expect(text()).toContain(part);
    }
    expect(text()).not.toContain("Days requested");
  });

  it("says No limit for a type with no allowance, with the days taken", () => {
    render();
    choose("SICK");
    expect(text()).toContain("No limit");
    expect(text()).toContain("3 days taken in 2026/2027.");
    expect(text()).not.toContain("Allowance");
  });

  it("says plainly when the person is already past the allowance", () => {
    render();
    choose("STUDY");
    expect(text()).toContain("Already 2 days past the 5-day allowance");
  });

  it("draws nothing when the payload carries no balances, rather than zeros", () => {
    const { balances: _hidden, ...withoutBalances } = OKAFOR;
    leave = withoutBalances as StaffLeave;
    render();
    choose("ANNUAL");
    expect(box()).toBeNull();
  });

  it("draws nothing when the type has no row", () => {
    leave = { ...OKAFOR, balances: [] };
    render();
    choose("ANNUAL");
    expect(box()).toBeNull();
  });
});

describe("LeaveDrawer days requested", () => {
  it("counts quietly while the dates settle, then shows the server's days, what is left and the return day", () => {
    render();
    choose("ANNUAL");
    pick(0, "2026-10-26");
    pick(1, "2026-10-30");
    expect(text()).toContain("Counting...");
    expect(previewArgs.every((call) => call.skip)).toBe(true);

    settle();
    expect(previewArgs.at(-1)).toEqual({
      arg: { id: 12, leave_type: "ANNUAL", start_date: "2026-10-26", end_date: "2026-10-30" },
      skip: false,
    });
    expect(text()).not.toContain("Counting...");
    expect(text()).toContain("Days requested");
    expect(text()).toContain("5");
    expect(text()).toContain("Left after this");
    expect(text()).toContain("3 days");
    expect(text()).toContain("Back on Monday, 2 Nov 2026");
  });

  it("asks nothing while the last day is before the first", () => {
    render();
    choose("ANNUAL");
    pick(0, "2026-10-30");
    pick(1, "2026-10-26");
    settle();
    expect(previewArgs.every((call) => call.skip)).toBe(true);
    expect(container.textContent).toContain("The last day cannot be before the first.");
  });

  it("names days over the allowance and still lets the request be filed", () => {
    previewResult = { data: { data: { ...PREVIEW, days: 11, remaining_after: -3, over_allowance_by: 3 } } };
    render();
    choose("ANNUAL");
    pick(0, "2026-10-26");
    pick(1, "2026-11-09");
    settle();
    expect(text()).toContain("3 days over the allowance");
    expect(text()).toContain("the approver decides");
    expect(saveButton().disabled).toBe(false);
  });

  it("leaves out a line the preview does not carry", () => {
    previewResult = { data: { data: { days: 5, resumption_date: "2026-11-02" } } };
    render();
    choose("ANNUAL");
    pick(0, "2026-10-26");
    pick(1, "2026-10-30");
    settle();
    expect(text()).toContain("Days requested");
    expect(text()).not.toContain("Left after this");
    expect(text()).toContain("Back on");
  });

  it("hides the figure when the preview fails, and filing still works", () => {
    previewResult = { isError: true };
    render();
    choose("ANNUAL");
    pick(0, "2026-10-26");
    pick(1, "2026-10-30");
    settle();
    expect(text()).not.toContain("Days requested");
    expect(text()).not.toContain("Counting...");
    expect(text()).toContain("Remaining");
    expect(saveButton().disabled).toBe(false);
  });

  it("excludes the request being edited from its own count", () => {
    render(PENDING);
    expect(previewArgs.at(-1)).toEqual({
      arg: {
        id: 12, leave_type: "ANNUAL", start_date: "2026-10-26", end_date: "2026-10-30", exclude: 7,
      },
      skip: false,
    });
    expect(text()).toContain("Days requested");
  });

  it("does not send an exclude when filing a new request", () => {
    render();
    choose("ANNUAL");
    pick(0, "2026-10-26");
    pick(1, "2026-10-30");
    settle();
    expect(previewArgs.at(-1)?.arg).not.toHaveProperty("exclude");
  });
});

describe("LeaveDrawer Field Access", () => {
  const fill = () => {
    choose("ANNUAL");
    pick(0, "2026-10-26");
    pick(1, "2026-10-30");
    settle();
  };

  it("leaves out the days, the balance and the return day when the server does not send them", () => {
    fieldAccess = {
      "school.leave": {
        hidden: ["days", "balances", "taken", "remaining_after", "over_allowance_by", "resumption_date"],
      },
    };
    const { balances: _b, days_taken: _d, balance_session: _s, balance_note: _n, ...bare } = OKAFOR;
    leave = bare as StaffLeave;
    previewResult = { data: { data: {} } };
    render();
    fill();
    expect(box()).toBeNull();
  });

  it("copes with the session being absent from both the balances and the preview", () => {
    const { balance_session: _s, ...withoutSession } = OKAFOR;
    leave = withoutSession as StaffLeave;
    previewResult = { data: { data: { days: 5 } } };
    render();
    choose("ANNUAL");
    expect(text()).toContain("Annual leave, this session");
    fill();
    expect(text()).toContain("Days requested");
  });

  it("offers the type and the days when filing even where the role may not correct them", async () => {
    fieldAccess = {
      "school.leave": {
        hidden: ["leave_type"],
        read_only: ["start_date", "end_date"],
        open_on_create: ["leave_type", "start_date", "end_date"],
      },
    };
    render();
    expect(container.querySelector("select")).not.toBeNull();
    fill();
    await act(async () => saveButton().click());
    expect(file).toHaveBeenCalledWith({
      id: 12,
      body: { leave_type: "ANNUAL", start_date: "2026-10-26", end_date: "2026-10-30", note: "" },
    });
  });

  it("keeps a correction to the write switches: read-only dates are left out", async () => {
    fieldAccess = {
      "school.leave": { read_only: ["start_date", "end_date"], open_on_create: ["start_date", "end_date"] },
    };
    render(PENDING);
    const note = container.querySelector("textarea")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    act(() => {
      setter.call(note, "Moved");
      note.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => saveButton().click());
    expect(update).toHaveBeenCalledWith({ leaveId: 7, body: { note: "Moved" } });
  });

  it("files when the response carries no warnings key", async () => {
    file.mockReturnValue({ unwrap: () => Promise.resolve({ data: {} }) });
    render();
    fill();
    await act(async () => saveButton().click());
    expect(toast.success).toHaveBeenCalled();
  });

  it("removes a hidden note and never offers it", () => {
    fieldAccess = { "school.leave": { hidden: ["note"] } };
    render();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.textContent).not.toContain("Note");
  });

  it("greys a read-only note and keeps it out of a correction", async () => {
    fieldAccess = { "school.leave": { read_only: ["note"] } };
    render(PENDING);
    const note = container.querySelector("textarea")!;
    expect(note.closest("fieldset")?.disabled).toBe(true);
    pick(1, "2026-10-29");
    await act(async () => saveButton().click());
    expect(update).toHaveBeenCalledWith({ leaveId: 7, body: { end_date: "2026-10-29" } });
  });

  it("sends the whole request when every field is writable", async () => {
    render();
    fill();
    await act(async () => saveButton().click());
    expect(file).toHaveBeenCalledWith({
      id: 12,
      body: { leave_type: "ANNUAL", start_date: "2026-10-26", end_date: "2026-10-30", note: "" },
    });
  });

  it("shows the server's own sentence when the school has no approver for the request", async () => {
    const message = "No one is set up to approve this yet. It will wait until the school appoints an approver.";
    file.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { warnings: [{ code: "NO_APPROVER", message, stage: "Leave approval" }] } }),
    });
    render();
    fill();
    await act(async () => saveButton().click());
    expect(toast.warning).toHaveBeenCalledWith(message, { duration: 10000 });
  });

  it("does not offer filing to a role that cannot give the dates", () => {
    fieldAccess = { "school.leave": { read_only: ["start_date", "end_date"] } };
    render();
    choose("ANNUAL");
    expect(saveButton().disabled).toBe(true);
    expect(container.textContent).toContain("cannot give every detail");
  });
});
