import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  BranchMoveOptions,
  BranchMoveResult,
} from "@/redux/services/students/students-types";

/**
 * Moving Tunde from Ikeja to Lekki, as the drawer shows it.
 *
 * Tunde owes ₦400,000 on his term bill and holds ₦10,000 of credit; ₦300,000
 * of the term is still to be taught. Lekki takes the bill, the credit and the
 * unearned fees, and owes Ikeja the ₦90,000 Ikeja has already earned. The API
 * hooks return fixed answers, so what is under test is what the drawer asks
 * for and what it says.
 */
let options: BranchMoveOptions;
let previewAnswer: BranchMoveResult | undefined;
const preview = vi.fn();
const move = vi.fn();

vi.mock("@/hooks/use-school-display", () => ({
  useSchoolDisplay: () => ({ prefs: undefined }),
}));
vi.mock("@/redux/services/students/students-api", () => ({
  useGetBranchMoveOptionsQuery: () => ({ data: { data: options }, isLoading: false }),
  useGetClassSeatsQuery: () => ({
    data: {
      data: [
        { id: 21, name: "JSS1 Lekki", branch: 2, capacity: 30, used: 12 },
        { id: 22, name: "JSS1 Ikeja", branch: 1, capacity: 30, used: 20 },
      ],
    },
  }),
  usePreviewBranchMoveMutation: () => [
    preview,
    { data: previewAnswer ? { data: previewAnswer } : undefined, error: undefined },
  ],
  useMoveStudentBranchMutation: () => [move, { isLoading: false }],
}));
vi.mock("@/components/ui/date-picker-input", () => ({
  DatePickerInput: (props: React.ComponentProps<"input">) => <input {...props} />,
}));
vi.mock("./drawer-shell", async (importActual) => {
  const actual = await importActual<typeof import("./drawer-shell")>();
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

import { BranchMoveDrawer, WhatMoves } from "./branch-move-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TUNDE = { id: 7, first_name: "Tunde", full_name: "Tunde Adeyemi", branch: 1 };

const MOVED: BranchMoveResult = {
  move: null,
  from_branch: 1,
  from_branch_name: "Ikeja",
  to_branch: 2,
  to_branch_name: "Lekki",
  effective_date: "2027-01-25",
  school_class: null,
  school_class_name: null,
  over_capacity: false,
  figures_shown: true,
  accounts: [
    {
      name: "Tunde Adeyemi",
      from_branch: 1,
      from_branch_name: "Ikeja",
      to_branch: 2,
      to_branch_name: "Lekki",
      invoice_count: 1,
      debit_note_count: 0,
      transfer: null,
      transfer_number: "",
      amount: 39_000_000,
      owed_amount: 40_000_000,
      credit_amount: 1_000_000,
      deferred_amount: 30_000_000,
      inter_branch_amount: 9_000_000,
      bills: [{ kind: "INVOICE", number: "INV-0042", amount: 40_000_000, deferred_amount: 30_000_000 }],
    },
  ],
  totals: {
    owed_amount: 40_000_000,
    credit_amount: 1_000_000,
    deferred_amount: 30_000_000,
    inter_branch_amount: 9_000_000,
    amount: 39_000_000,
  },
};

let host: HTMLDivElement;
let root: Root;

function render(node: ReactNode) {
  act(() => root.render(node));
}

function change(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(element);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  act(() => {
    setter?.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  options = {
    branch: 1,
    branch_name: "Ikeja",
    status: "ACTIVE",
    school_class: 22,
    school_class_name: "JSS1 Ikeja",
    class_is_shared: false,
    needs_class: true,
    figures_shown: true,
    branches: [{ id: 2, name: "Lekki", today: "2027-01-25" }],
  };
  previewAnswer = MOVED;
  preview.mockReset();
  move.mockReset();
  move.mockReturnValue({ unwrap: () => Promise.resolve({ data: { ...MOVED, move: 3 } }) });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("what a move carries", () => {
  it("names the bill, the credit, the unearned fees and what Lekki owes Ikeja", () => {
    render(<WhatMoves result={MOVED} firstName="Tunde" preview />);
    const text = host.textContent ?? "";
    expect(text).toContain("INV-0042");
    expect(text).toContain("₦10,000.00");
    expect(text).toContain("₦300,000.00");
    expect(text).toContain("Lekki will owe Ikeja ₦90,000.00 for the fees Ikeja already earned");
  });

  it("says Ikeja owes Lekki when the credit and unearned fees are more", () => {
    const credit = { ...MOVED, totals: { ...MOVED.totals!, inter_branch_amount: -500_000 } };
    render(<WhatMoves result={credit} firstName="Tunde" />);
    expect(host.textContent).toContain("Ikeja owes Lekki ₦5,000.00");
  });

  it("gives no amount to a reader whose role does not read bills", () => {
    const hidden: BranchMoveResult = {
      ...MOVED,
      figures_shown: false,
      totals: undefined,
      accounts: [{ ...MOVED.accounts[0], amount: undefined, bills: undefined }],
    };
    render(<WhatMoves result={hidden} firstName="Tunde" preview />);
    expect(host.textContent).toContain("with 1 open bill");
    expect(host.textContent).not.toContain("₦");
  });

  it("says no money moves for a pupil never billed", () => {
    render(<WhatMoves result={{ ...MOVED, accounts: [], totals: undefined }} firstName="Tunde" />);
    expect(host.textContent).toContain("Tunde has no fee account yet, so no money moved.");
  });
});

describe("the move drawer", () => {
  it("chooses the only other branch, previews the move on its today, and sends the class and reason", async () => {
    render(<BranchMoveDrawer student={TUNDE} open onClose={() => {}} />);

    expect(preview).toHaveBeenCalledWith({ id: 7, to_branch: "2", effective_date: "2027-01-25" });
    const classes = host.querySelectorAll("select")[1] as HTMLSelectElement;
    // A class of the branch the pupil leaves is never offered.
    expect(Array.from(classes.options).map((o) => o.textContent)).not.toContain("JSS1 Ikeja · 20/30");
    const save = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Move pupil")!;
    expect(save.disabled).toBe(true);

    change(classes, "21");
    change(host.querySelector("textarea")!, "Family moved to Lekki");
    expect(save.disabled).toBe(false);
    await act(async () => save.click());

    expect(move).toHaveBeenCalledWith({
      id: 7,
      to_branch: "2",
      effective_date: "2027-01-25",
      reason: "Family moved to Lekki",
      school_class: 21,
      allow_over_capacity: false,
    });
    expect(host.textContent).toContain("Tunde now attends Lekki");
  });

  it("offers a sentence and no form when there is nowhere the reader may move the pupil", () => {
    options = { ...options, branches: [] };
    render(<BranchMoveDrawer student={TUNDE} open onClose={() => {}} />);
    expect(host.textContent).toContain("Moving a pupil needs somebody who works at both branches");
    expect(host.querySelector("select")).toBeNull();
  });
});
