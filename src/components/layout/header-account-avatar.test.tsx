import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const staff = vi.hoisted(() => ({
  mine: vi.fn(),
  member: vi.fn(),
}));

vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetMyStaffRecordQuery: staff.mine,
  useGetStaffMemberQuery: staff.member,
}));

vi.mock("@/pages/protected/students/person-avatar", () => ({
  PersonAvatar: ({ name, photoUrl }: { name: string; photoUrl?: string }) => (
    <span data-testid="avatar" data-name={name} data-photo={photoUrl ?? ""} />
  ),
}));

import { HeaderAccountAvatar } from "./header-account-avatar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  staff.mine.mockReturnValue({ data: { data: { id: 17 } } });
  staff.member.mockReturnValue({
    data: { data: { photo_url: "/media/staff/17/photo.jpg" } },
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe("HeaderAccountAvatar", () => {
  it("shows the photograph from the signed-in person's staff record", async () => {
    await act(async () => {
      root.render(<HeaderAccountAvatar name="Ada Okoye" />);
    });

    expect(staff.member).toHaveBeenCalledWith(17);
    const avatar = container.querySelector("[data-testid='avatar']");
    expect(avatar?.getAttribute("data-name")).toBe("Ada Okoye");
    expect(avatar?.getAttribute("data-photo")).toBe("/media/staff/17/photo.jpg");
  });

  it("keeps the initials fallback when the account has no staff record", async () => {
    staff.mine.mockReturnValue({ data: undefined });
    staff.member.mockReturnValue({ data: undefined });

    await act(async () => {
      root.render(<HeaderAccountAvatar name="Ada Okoye" />);
    });

    const avatar = container.querySelector("[data-testid='avatar']");
    expect(avatar?.getAttribute("data-name")).toBe("Ada Okoye");
    expect(avatar?.getAttribute("data-photo")).toBe("");
  });
});
