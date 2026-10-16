import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationSettingRow } from "@/redux/services/notifications/notification-settings-api";

/**
 * Push beside email on the notification settings.
 *
 * Corona's notices are emailed and pushed to phones; a pupil's result notice
 * is pushed and has no email. The bursar turns the notice push off: the save
 * names the push channel, and the email choice is left alone.
 */
const row = (over: Partial<NotificationSettingRow>): NotificationSettingRow => ({
  event_type_key: "notices.published",
  event_type_label: "New notice",
  source_module: "vs_notices",
  source_module_label: "Notices",
  channel: "email",
  is_enabled: true,
  is_transactional: false,
  source: "default",
  can_edit: true,
  ...over,
});
const ROWS = [
  row({}),
  row({ channel: "push" }),
  row({ event_type_key: "gradebook.result_released", event_type_label: "Your result is ready",
        source_module_label: "Gradebook", channel: "push" }),
];
const save = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
vi.mock("@/hooks/use-capabilities", () => ({ useCapabilities: () => ({ hasCapability: () => true }) }));
vi.mock("../use-settings-branches", () => ({
  useSettingsBranches: () => ({ isLoading: false, wholeSchool: true, choices: [], applies: false }),
}));
vi.mock("@/redux/services/notifications/notification-settings-api", () => ({
  settingRows: (data: unknown) => (Array.isArray(data) ? data : []),
  useGetNotificationSettingsQuery: () => ({ currentData: { data: ROWS }, isError: false }),
  useUpdateNotificationSettingsMutation: () => [save],
}));
vi.mock("@/redux/services/dashboard/workflow-api", () => ({
  useGetWorkflowNotificationSettingQuery: () => ({ data: { enabled: true }, isLoading: false }),
  useSetWorkflowNotificationSettingMutation: () => [vi.fn(), { isLoading: false }],
}));

import { NotificationsSection } from "./notifications-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("push on the notification settings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    save.mockReset();
    save.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const toggle = (label: string) =>
    container.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;

  it("offers a push switch beside email, and alone where there is no email", async () => {
    await act(async () => root.render(<NotificationsSection />));
    expect(toggle("Email: New notice")).not.toBeNull();
    expect(toggle("Push: New notice")).not.toBeNull();
    expect(toggle("Push: Your result is ready")).not.toBeNull();
    expect(toggle("Email: Your result is ready")).toBeNull();
  });

  it("saves the push channel only when push is turned off", async () => {
    await act(async () => root.render(<NotificationsSection />));
    await act(async () => toggle("Push: New notice")!.click());
    expect(save).toHaveBeenCalledWith({
      updates: [{ event_type_key: "notices.published", channel: "push", is_enabled: false }],
      branch: undefined,
    });
  });
});
