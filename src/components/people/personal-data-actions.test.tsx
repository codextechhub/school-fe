import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The data request actions on a person's profile.
 *
 * Mrs Nwosu asks Brightfield for everything it holds on her son Chiamaka, who
 * has been withdrawn, and then for it to be erased. The administrator holding
 * the two keys sees both buttons; erasing waits for a reason, and a refusal
 * from the server stays in the sheet. A role without the keys sees neither,
 * and a pupil still on the roll is never offered Erase.
 */
const held = new Set<string>();
const download = vi.fn();
const erase = vi.fn();
const toastSuccess = vi.fn();
const saved = vi.fn();

vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: vi.fn() } }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess: {},
    hasPermission: (code: string) => held.has(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => held.has(c)),
    hasAllPermissions: (codes: string[]) => codes.every((c) => held.has(c)),
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-capabilities", () => ({
  useCapabilities: () => ({ hasCapability: () => true }),
}));
vi.mock("@/redux/services/personal-data-api", () => ({
  useDownloadPersonalDataMutation: () => [download, { isLoading: false }],
  useErasePersonalDataMutation: () => [erase, { isLoading: false }],
}));
vi.mock("@/utils/attachment-download", () => ({
  downloadObjectUrl: (url: string, name: string) => saved(url, name),
}));

import { P } from "@/permissions";
import { PersonalDataActions, PUPIL_LEFT_STATUSES } from "./personal-data-actions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const button = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;

describe("PersonalDataActions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    held.clear();
    [download, erase, toastSuccess, saved].forEach((fn) => fn.mockReset());
    URL.revokeObjectURL = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
  });

  const render = (canErase = true) =>
    act(() => {
      root.render(
        <PersonalDataActions kind="student" id={7} name="Chiamaka Nwosu" canErase={canErase} />,
      );
    });

  it("shows nothing to a role without the keys", () => {
    render();
    expect(button("Download their data")).toBeUndefined();
    expect(button("Erase their details")).toBeUndefined();
  });

  it("downloads the copy under the person's file name", async () => {
    held.add(P.EXPORT_PERSONAL_DATA);
    download.mockReturnValue({ unwrap: () => Promise.resolve("blob:copy") });
    render();

    await act(async () => button("Download their data")!.click());

    expect(download).toHaveBeenCalledWith({ kind: "student", id: 7 });
    expect(saved).toHaveBeenCalledWith("blob:copy", "personal-data-student-7.json");
  });

  it("never offers Erase for a pupil still on the roll", () => {
    held.add(P.ERASE_PERSONAL_DATA);
    render(PUPIL_LEFT_STATUSES.has("ACTIVE"));
    expect(button("Erase their details")).toBeUndefined();
  });

  it("erases only once a reason is given, and sends it", async () => {
    held.add(P.ERASE_PERSONAL_DATA);
    erase.mockReturnValue({ unwrap: () => Promise.resolve({ message: "Chiamaka Nwosu's personal details are erased." }) });
    render(PUPIL_LEFT_STATUSES.has("WITHDRAWN"));

    await act(async () => button("Erase their details")!.click());
    expect(document.body.textContent).toContain("health notes");
    expect(button("Erase for good")!.disabled).toBe(true);

    const reason = document.body.querySelector("textarea")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(reason, "Mrs Nwosu's email of 2 November");
      reason.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(button("Erase for good")!.disabled).toBe(false);

    await act(async () => button("Erase for good")!.click());

    expect(erase).toHaveBeenCalledWith({
      kind: "student", id: 7, reason: "Mrs Nwosu's email of 2 November",
    });
    expect(toastSuccess).toHaveBeenCalledWith("Chiamaka Nwosu's personal details are erased.");
  });

  it("keeps the sheet open with the server's reason when it refuses", async () => {
    held.add(P.ERASE_PERSONAL_DATA);
    erase.mockReturnValue({
      unwrap: () => Promise.reject({
        status: 400,
        data: { success: false, message: "Only a pupil who has left can be erased. Withdraw them first." },
      }),
    });
    render(true);

    await act(async () => button("Erase their details")!.click());
    const reason = document.body.querySelector("textarea")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(reason, "Her letter");
      reason.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button("Erase for good")!.click());

    expect(document.body.querySelector("[role=alert]")?.textContent).toContain("Withdraw them first");
    expect(button("Erase for good")).toBeDefined();
  });
});
