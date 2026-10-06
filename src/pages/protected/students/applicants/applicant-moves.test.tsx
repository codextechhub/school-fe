import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AdmissionStage,
  StudentRow,
} from "@/redux/services/students/students-types";

/**
 * Amaka Obi applied to Bright Star School and is at Interview. The school's
 * steps are Interview, Assessment and Offer, and an offer gives the family 14
 * days. The API hooks are fakes, so what is under test is what each move asks
 * for before it is sent and what it sends.
 */
const move = vi.fn();
const confirm = vi.fn();
const reject = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));
vi.mock("@/lib/as-at", () => ({ todayIso: () => "2026-10-06" }));
vi.mock("@/redux/services/students/students-api", () => ({
  useMoveApplicantStageMutation: () => [move, { isLoading: false }],
  useConfirmApplicantMutation: () => [confirm, { isLoading: false }],
  useRejectApplicantMutation: () => [reject, { isLoading: false }],
  useGetAdmissionPolicyQuery: () => ({ data: undefined }),
}));
vi.mock("../drawers/drawer-shell", async (importActual) => {
  const actual = await importActual<typeof import("../drawers/drawer-shell")>();
  return {
    ...actual,
    DrawerShell: ({
      open,
      title,
      children,
      saveLabel,
      onSave,
      canSave,
    }: {
      open: boolean;
      title: string;
      children: ReactNode;
      saveLabel: string;
      onSave: () => void;
      canSave: boolean;
    }) =>
      open ? (
        <div data-drawer={title}>
          {children}
          <button type="button" disabled={!canSave} onClick={onSave}>{saveLabel}</button>
        </div>
      ) : null,
  };
});
vi.mock("../drawers/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    confirmLabel,
  }: {
    open: boolean;
    onConfirm: () => void;
    confirmLabel: string;
  }) =>
    open ? (
      <button type="button" data-confirm onClick={onConfirm}>{confirmLabel}</button>
    ) : null,
}));

import {
  CloseApplication,
  ConfirmEnrolment,
  REASON_MAX,
  StageControls,
} from "./applicant-moves";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STAGES: AdmissionStage[] = [
  { id: 11, name: "Interview", position: 1, is_offer: false, offer_valid_days: null, applicants: 3 },
  { id: 12, name: "Assessment", position: 2, is_offer: false, offer_valid_days: null, applicants: 1 },
  { id: 13, name: "Offer", position: 3, is_offer: true, offer_valid_days: 14, applicants: 0 },
];

const AMAKA = {
  id: 7,
  first_name: "Amaka",
  full_name: "Amaka Obi",
  branch: 1,
  student_number: "",
  admission_stage: 11,
  admission_stage_name: "Interview",
  offer_expires_on: null,
  offer_expired: false,
} as unknown as StudentRow;

let host: HTMLDivElement;
let root: Root;

function render(node: ReactNode) {
  act(() => root.render(node));
}

function change(element: HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(element);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  act(() => {
    setter?.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
    );
  });
}

function button(label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!found) throw new Error(`No button "${label}" in: ${host.innerHTML}`);
  return found as HTMLButtonElement;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
}

function reasonBox(): HTMLTextAreaElement {
  const box = host.querySelector("textarea");
  if (!box) throw new Error("No reason box");
  return box;
}

function answer(fn: ReturnType<typeof vi.fn>, result: Promise<unknown>) {
  fn.mockReturnValue({ unwrap: () => result });
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  for (const fn of [move, confirm, reject, toastError, toastSuccess]) fn.mockReset();
  answer(move, Promise.resolve({ data: {} }));
  answer(confirm, Promise.resolve({ data: {} }));
  answer(reject, Promise.resolve({ data: {} }));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("moving an applicant to another step", () => {
  it("asks why before moving, and sends the reason with the step", async () => {
    render(<StageControls student={AMAKA} stages={STAGES} />);
    change(host.querySelector("select")!, "12");

    expect(move).not.toHaveBeenCalled();
    expect(host.querySelector('[data-drawer="Move to Assessment"]')).not.toBeNull();
    expect(host.textContent).toContain("Reason (optional)");
    expect(reasonBox().maxLength).toBe(REASON_MAX);

    change(reasonBox(), "  Passed the entrance interview  ");
    await click(button("Move"));

    expect(move).toHaveBeenCalledWith({
      id: 7,
      stage: 12,
      reason: "Passed the entrance interview",
    });
    expect(toastSuccess).toHaveBeenCalledWith("Amaka Obi moved to Assessment.");
    expect(host.querySelector("[data-drawer]")).toBeNull();
  });

  it("moves with the reason left blank, and sends no reason", async () => {
    render(<StageControls student={AMAKA} stages={STAGES} />);
    change(host.querySelector("select")!, "");

    expect(host.querySelector('[data-drawer="Move back to Not started"]')).not.toBeNull();
    expect(button("Move").disabled).toBe(false);
    await click(button("Move"));

    expect(move).toHaveBeenCalledWith({ id: 7, stage: null });
  });

  it("says how long the family has when the step is an offer", () => {
    render(<StageControls student={AMAKA} stages={STAGES} />);
    change(host.querySelector("select")!, "13");
    expect(host.textContent).toContain("Offer is an offer. The family has 14 days from today to accept.");
  });

  it("extends an expired offer by a week with its reason", async () => {
    const expired = {
      ...AMAKA,
      admission_stage: 13,
      admission_stage_name: "Offer",
      offer_expires_on: "2026-10-01",
      offer_expired: true,
    } as StudentRow;
    render(<StageControls student={expired} stages={STAGES} />);
    await click(button("Extend 7 days"));

    expect(move).not.toHaveBeenCalled();
    expect(host.querySelector('[data-drawer="Extend the offer"]')).not.toBeNull();
    change(reasonBox(), "Family asked for more time");
    await click(button("Extend"));

    expect(move).toHaveBeenCalledWith({
      id: 7,
      stage: 13,
      offer_expires_on: "2026-10-13",
      reason: "Family asked for more time",
    });
  });

  it("shows the server's refusal once and keeps the drawer and its reason", async () => {
    answer(
      move,
      Promise.reject({
        status: 422,
        data: { message: "Amaka Obi is enrolled, so there is no admission stage to move." },
      }),
    );
    render(<StageControls student={AMAKA} stages={STAGES} />);
    change(host.querySelector("select")!, "12");
    change(reasonBox(), "Passed");
    await click(button("Move"));

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(host.querySelector('[data-drawer="Move to Assessment"]')).not.toBeNull();
    expect(reasonBox().value).toBe("Passed");
  });
});

describe("putting an applicant on the roll", () => {
  it("sends the reason when one is given", async () => {
    render(<ConfirmEnrolment student={AMAKA} onClose={() => undefined} />);
    expect(host.textContent).toContain("Reason (optional)");
    change(reasonBox(), "Offer accepted and fees paid");
    await click(button("Enrol"));

    expect(confirm).toHaveBeenCalledWith({ id: 7, reason: "Offer accepted and fees paid" });
  });

  it("enrols with the reason left blank", async () => {
    render(<ConfirmEnrolment student={AMAKA} onClose={() => undefined} />);
    await click(button("Enrol"));
    expect(confirm).toHaveBeenCalledWith({ id: 7 });
  });
});

describe("closing an application", () => {
  it("cannot continue until a reason is typed, then sends it", async () => {
    render(<CloseApplication student={AMAKA} onClose={() => undefined} />);

    expect(host.textContent).not.toContain("Reason (optional)");
    expect(button("Continue").disabled).toBe(true);
    change(reasonBox(), "   ");
    expect(button("Continue").disabled).toBe(true);

    change(reasonBox(), "Family chose another school");
    expect(button("Continue").disabled).toBe(false);
    await click(button("Continue"));
    await click(button("Close application"));

    expect(reject).toHaveBeenCalledWith({ id: 7, reason: "Family chose another school" });
  });
});
