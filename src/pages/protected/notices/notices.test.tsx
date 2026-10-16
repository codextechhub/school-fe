import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { Notice, NoticeAudienceOptions } from "@/redux/services/notices/notices-types";

/**
 * The staff Notices screens.
 *
 * Brightfield's admin posts "PTA meeting Saturday" to JSS1 A. The drafting
 * drawer follows Field Access on `school.notices`: a hidden field is not shown,
 * a read-only one is shown and never sent, and all three are open while a
 * notice is first written. The audience picker keeps "Whole school" on its own.
 * The notice drawer offers Publish and Withdraw only where the server says the
 * viewer may manage the notice.
 */
const OPTIONS: NoticeAudienceOptions = {
  school: true,
  branches: [
    { id: 1, name: "Lekki" },
    { id: 2, name: "Ikeja" },
  ],
  levels: [{ id: 5, name: "JSS1" }],
  classes: [{ id: 9, name: "JSS1 A" }],
};
const PUBLISHED: Notice = {
  id: 3,
  title: "PTA meeting Saturday",
  body: "All parents are welcome.",
  status: "PUBLISHED",
  audience: [{ kind: "CLASS", id: 9, name: "JSS1 A" }],
  audience_label: "JSS1 A",
  published_at: "2026-10-10T09:00:00Z",
  published_by: "Adaeze Okafor",
  read_count: 12,
  audience_count: 32,
  can_manage: true,
};

let fieldAccess: FieldAccessMap = {};
let detail: Notice | undefined = PUBLISHED;
const create = vi.fn();
const update = vi.fn();
const publish = vi.fn();
const withdraw = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/redux/services/notices/notices-api", () => ({
  useCreateNoticeMutation: () => [create, { isLoading: false }],
  useUpdateNoticeMutation: () => [update, { isLoading: false }],
  usePublishNoticeMutation: () => [publish, { isLoading: false }],
  useWithdrawNoticeMutation: () => [withdraw, { isLoading: false }],
  useGetNoticeQuery: () => ({ data: detail ? { data: detail } : undefined }),
}));

import { NoticeDetail } from "./notice-detail";
import { NoticeDrawer } from "./notice-drawer";
import { problemsWith } from "./notice-copy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const buttons = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).filter(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement[];

async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function checkboxFor(label: string) {
  const row = Array.from(document.body.querySelectorAll("label")).find(
    (l) => l.textContent?.trim() === label,
  );
  return row?.querySelector("button[role='checkbox']") as HTMLButtonElement;
}

describe("problemsWith", () => {
  it("asks for a title and a message, and an audience only when publishing", () => {
    expect(problemsWith({ title: "", body: "", audience: [] }, false)).toEqual({
      title: "Give the notice a title.",
      body: "Write the notice before saving it.",
    });
    expect(
      problemsWith({ title: "PTA", body: "Saturday.", audience: [] }, true).audience,
    ).toBe("Choose who this notice is for before publishing it.");
  });
});

describe("notice screens", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    for (const fn of [create, update, publish, withdraw]) {
      fn.mockReset();
      fn.mockReturnValue({ unwrap: () => Promise.resolve({ message: "Done." }) });
    }
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    fieldAccess = {};
    detail = PUBLISHED;
  });

  it("publishes a new notice to the class it was written for", async () => {
    await act(async () =>
      root.render(<NoticeDrawer open notice={null} options={OPTIONS} onClose={() => {}} />),
    );
    await typeInto(document.body.querySelector("input") as HTMLInputElement, "PTA meeting Saturday");
    await typeInto(document.body.querySelector("textarea") as HTMLTextAreaElement, "All parents are welcome.");
    await act(async () => checkboxFor("JSS1 A").click());
    await act(async () => (document.body.querySelector("button[role='switch']") as HTMLButtonElement).click());
    await act(async () => buttons("Publish notice")[0].click());

    expect(create).toHaveBeenCalledWith({
      title: "PTA meeting Saturday",
      body: "All parents are welcome.",
      audience: [{ kind: "CLASS", id: 9 }],
      publish: true,
    });
  });

  it("keeps Whole school on its own", async () => {
    await act(async () =>
      root.render(<NoticeDrawer open notice={null} options={OPTIONS} onClose={() => {}} />),
    );
    await act(async () => checkboxFor("JSS1 A").click());
    await act(async () => checkboxFor("Whole school").click());

    expect(checkboxFor("Whole school").getAttribute("data-state")).toBe("checked");
    expect(checkboxFor("JSS1 A").getAttribute("data-state")).toBe("unchecked");
  });

  it("offers the title, message and audience on a new notice whatever the switches say", async () => {
    fieldAccess = {
      [FIELD_RESOURCE.NOTICES]: {
        hidden: [],
        read_only: ["title", "body", "audience"],
        open_on_create: ["title", "body", "audience"],
      },
    };
    await act(async () =>
      root.render(<NoticeDrawer open notice={null} options={OPTIONS} onClose={() => {}} />),
    );

    expect((document.body.querySelector("input") as HTMLInputElement).disabled).toBe(false);
    expect(checkboxFor("JSS1 A")).toBeTruthy();
  });

  it("leaves a hidden message out and never sends a read-only title on a correction", async () => {
    // As the server sends it to such a role: no message, and the title listed
    // as read-only on the record.
    const { body: _hidden, ...withoutBody } = PUBLISHED;
    void _hidden;
    const asSent: Notice = { ...withoutBody, _read_only_fields: ["title", "audience"] };
    fieldAccess = {
      [FIELD_RESOURCE.NOTICES]: { hidden: ["body"], read_only: ["title"] },
    };
    await act(async () =>
      root.render(<NoticeDrawer open notice={asSent} options={OPTIONS} onClose={() => {}} />),
    );

    expect(document.body.querySelector("textarea")).toBeNull();
    expect((document.body.querySelector("input") as HTMLInputElement).disabled).toBe(true);
    await act(async () => buttons("Save changes")[0].click());
    expect(update.mock.calls[0][0]).not.toHaveProperty("title");
    expect(update.mock.calls[0][0]).not.toHaveProperty("audience");
  });

  it("shows the read count and withdraws a published notice after the confirm", async () => {
    await act(async () =>
      root.render(<NoticeDetail noticeId={3} onClose={() => {}} onEdit={() => {}} />),
    );

    expect(document.body.textContent).toContain("12 of 32 students have read it");
    await act(async () => buttons("Withdraw")[0].click());
    await act(async () => buttons("Withdraw").pop()?.click());
    expect(withdraw).toHaveBeenCalledWith(3);
  });

  it("offers no actions on a notice the viewer may not manage", async () => {
    detail = { ...PUBLISHED, can_manage: false };
    await act(async () =>
      root.render(<NoticeDetail noticeId={3} onClose={() => {}} onEdit={() => {}} />),
    );

    expect(buttons("Withdraw")).toHaveLength(0);
    expect(buttons("Edit")).toHaveLength(0);
  });

  it("drops the read count where Field Access hides it", async () => {
    fieldAccess = { [FIELD_RESOURCE.NOTICES]: { hidden: ["reads"], read_only: [] } };
    await act(async () =>
      root.render(<NoticeDetail noticeId={3} onClose={() => {}} onEdit={() => {}} />),
    );

    expect(document.body.textContent).not.toContain("have read it");
  });
});
